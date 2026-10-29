import type {
  Actor,
  AppNotification,
  Attempt,
  Branch,
  DashboardUser,
  DayKey,
  Driver,
  LocalizedText,
  MaterialCode,
  NotificationKind,
  PickupRequest,
  PlanApproval,
  Reason,
  RequestStatus,
  StatusChange,
  SubtypeCode,
  VisitOutcome,
} from './types';
import { CODES, DISTRICTS, IDS, MATERIALS, REASONS, setCatalog, type CatalogRows } from './catalog';
import { ApiError, supabase, toApiError } from '../lib/supabase';
import { addDays, nextWorkingDay, opsToday } from '../lib/dates';
import { initials } from '../lib/format';

/**
 * DATA ACCESS LAYER — the only module the UI calls for data.
 * Reads go to tables/views (scoped by row level security); every change goes through a database
 * function (RPC) that enforces the business rules. See /supabase/README.md.
 */

/** Requests older than this are only loaded while still open. */
export const REQUEST_WINDOW_DAYS = 120;
const PAGE = 1000;

type Result<T> = { data: T | null; error: { message: string; code?: string; details?: string | null } | null };

async function run<T>(query: PromiseLike<Result<T>>): Promise<T> {
  let res: Result<T>;
  try {
    res = await query;
  } catch (e) {
    throw toApiError({ message: e instanceof Error ? e.message : String(e) });
  }
  if (res.error) throw toApiError(res.error);
  return res.data as T;
}

/** Reads every page of a list query (the API returns at most 1,000 rows per call). */
async function all<T>(page: (from: number, to: number) => PromiseLike<Result<T[]>>): Promise<T[]> {
  const out: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const rows = await run(page(from, from + PAGE - 1));
    out.push(...rows);
    if (rows.length < PAGE) return out;
  }
}

const sinceDay = () => addDays(opsToday(), -REQUEST_WINDOW_DAYS);
const ref = (n: number) => `REQ-${n}`;

// ---------------------------------------------------------------- session + reference data

export interface Profile {
  id: string;
  role: 'staff' | 'branch' | 'driver';
  display_name: string;
  display_name_en: string | null;
  phone: string | null;
  active: boolean;
  must_change_password: boolean;
}

/** Dashboard users sign in with their email or their mobile (05XXXXXXXX → its login email). */
export const STAFF_LOGIN_DOMAIN = 'staff.cloudswater.co';
export const loginEmail = (id: string) => {
  const v = id.trim().toLowerCase().replace(/\s+/g, '');
  return /^05[0-9]{8}$/.test(v) ? `s-${v}@${STAFF_LOGIN_DOMAIN}` : v;
};

export async function signIn(identifier: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email: loginEmail(identifier), password });
  if (error) {
    if (/invalid login credentials/i.test(error.message)) throw new ApiError('INVALID_CREDENTIALS');
    if (/rate limit|too many/i.test(error.message)) throw new ApiError('TOO_MANY_ATTEMPTS');
    if (/email not confirmed/i.test(error.message)) throw new ApiError('EMAIL_NOT_CONFIRMED');
    throw toApiError(error);
  }
}

export const signOut = () => supabase.auth.signOut();

export async function fetchProfile(userId: string): Promise<Profile | null> {
  return run(supabase.from('profiles').select('id, role, display_name, display_name_en, phone, active, must_change_password').eq('id', userId).maybeSingle());
}

/** First sign-in with a temporary password: set a new one and clear the flag. */
export async function changePassword(password: string) {
  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    if (/same|different from the old/i.test(error.message)) throw new ApiError('SAME_PASSWORD');
    if (/weak|at least|characters/i.test(error.message)) throw new ApiError('WEAK_PASSWORD');
    throw toApiError(error);
  }
  await run(supabase.rpc('complete_password_change'));
}

export async function loadCatalog() {
  const [cities, districts, chains, materials, subtypes, reasons, settings] = await Promise.all([
    run(supabase.from('cities').select('id, code, name_ar, name_en, sort_order, active')),
    all((a, b) => supabase.from('districts').select('id, city_id, name_ar, name_en, active').order('id').range(a, b)),
    run(supabase.from('chains').select('id, code, name_ar, name_en, active').order('created_at')),
    run(supabase.from('materials').select('id, code, name_ar, name_en, color_light, color_dark, icon, sort_order, active, manager_id, contact_phone')),
    run(supabase.from('material_subtypes').select('id, code, material_id, name_ar, name_en, active').order('created_at')),
    run(supabase.from('reasons').select('id, kind, label_ar, label_en, sort_order, active')),
    run(supabase.from('app_settings').select('key, value')),
  ]);
  const rows = { cities, districts, chains, materials, subtypes, reasons, settings } as CatalogRows;
  setCatalog(rows);
  return rows;
}

/** Materials a dashboard user manages, in display order. */
export const managedMaterials = (userId: string) => Object.keys(MATERIALS).filter((code) => MATERIALS[code].managerId === userId);

export function toDashboardUser(p: {
  id: string;
  display_name: string;
  display_name_en: string | null;
  phone?: string | null;
  material_ids?: string[];
  email?: string;
  active?: boolean;
}): DashboardUser {
  const ar = p.display_name;
  const en = p.display_name_en || p.display_name;
  const materials = p.material_ids ? p.material_ids.map((id) => CODES.material[id]).filter(Boolean) : managedMaterials(p.id);
  return {
    id: p.id,
    name: { ar, en },
    firstName: { ar: ar.split(' ')[0], en: en.split(' ')[0] },
    initials: { ar: initials(ar), en: initials(en).toUpperCase() },
    role: materials.length ? 'supervisor' : 'gm',
    material: materials[0],
    materials,
    phone: p.phone ?? null,
    email: p.email,
    active: p.active,
  };
}

// ---------------------------------------------------------------- reads

export interface RequestRow extends PickupRequest {
  branch: Branch;
}

/** Display reference → uuid, filled whenever requests are read. */
const uuids = new Map<string, string>();

interface ListRow {
  id: string;
  number: number;
  status: RequestStatus;
  kg: number | null;
  note: string | null;
  contact_name: string | null;
  contact_phone: string | null;
  branch_photo_path: string | null;
  visit_day: string | null;
  driver_id: string | null;
  created_via: 'branch_app' | 'dashboard';
  decision_since: string | null;
  draft_cancelled: boolean;
  cancel_reason_id: string | null;
  cancel_note: string | null;
  closed_reason: string | null;
  created_at: string;
  updated_at: string;
  branch_id: string;
  branch_number: string;
  branch_phone: string | null;
  chain_code: string;
  district_id: string;
  city_code: string;
  material_code: string;
  subtype_code: string | null;
  last_outcome: VisitOutcome | null;
  last_attempt_day: string | null;
  last_attempt_at: string | null;
  last_reason_ar: string | null;
  last_reason_en: string | null;
  last_attempt_note: string | null;
  last_attempt_photo: string | null;
  last_attempt_driver_id: string | null;
  created_by: string | null;
  cancelled_by: string | null;
  closed_by: string | null;
  branch_name: string | null;
  branch_address: string | null;
  branch_access_notes: string | null;
  lat: number | null;
  lng: number | null;
}

interface AttemptRow {
  request_id: string;
  visit_day: string;
  recorded_at: string;
  driver_id: string;
  outcome: VisitOutcome;
  reason_id: string | null;
  reason_text: string | null;
  note: string | null;
  photo_path: string | null;
}

const LIST_COLUMNS =
  'id, number, status, kg, note, contact_name, contact_phone, branch_photo_path, visit_day, driver_id, created_via, decision_since, draft_cancelled, ' +
  'cancel_reason_id, cancel_note, closed_reason, created_at, updated_at, branch_id, branch_number, branch_phone, chain_code, district_id, city_code, ' +
  'material_code, subtype_code, last_outcome, last_attempt_day, last_attempt_at, last_reason_ar, last_reason_en, last_attempt_note, last_attempt_photo, ' +
  'last_attempt_driver_id, created_by, cancelled_by, closed_by, branch_name, branch_address, branch_access_notes, lat, lng';

const toAttempt = (a: AttemptRow): Attempt => ({
  day: a.visit_day,
  at: a.recorded_at,
  driverId: a.driver_id,
  outcome: a.outcome,
  reason: a.reason_id ? REASONS[a.reason_id] : a.reason_text ? { ar: a.reason_text, en: a.reason_text } : undefined,
  note: a.note ?? undefined,
  hasPhoto: !!a.photo_path,
});

function toRow(r: ListRow, attempts: Attempt[]): RequestRow {
  // The attempts window may miss old attempts of a request that is still open — fall back to the latest one.
  if (attempts.length === 0 && r.last_outcome && r.last_attempt_day && r.last_attempt_at && r.last_attempt_driver_id) {
    attempts = [
      {
        day: r.last_attempt_day,
        at: r.last_attempt_at,
        driverId: r.last_attempt_driver_id,
        outcome: r.last_outcome,
        reason: r.last_reason_ar ? { ar: r.last_reason_ar, en: r.last_reason_en ?? r.last_reason_ar } : undefined,
        note: r.last_attempt_note ?? undefined,
        hasPhoto: !!r.last_attempt_photo,
      },
    ];
  }
  const createdBy: Actor =
    r.created_via === 'dashboard' && r.created_by ? { kind: 'user', userId: r.created_by } : { kind: 'branch', name: r.contact_name ?? '' };
  const byStaff = !!(r.cancel_reason_id || r.cancel_note);
  return {
    id: ref(r.number),
    uuid: r.id,
    number: r.number,
    branchId: r.branch_id,
    material: r.material_code,
    subtype: r.subtype_code,
    kg: r.kg === null ? null : Number(r.kg),
    createdAt: r.created_at,
    status: r.status,
    contact: r.contact_name && r.contact_phone ? { name: r.contact_name, phone: r.contact_phone } : undefined,
    createdBy,
    note: r.note ?? undefined,
    hasBranchPhoto: !!r.branch_photo_path,
    branchPhotoPath: r.branch_photo_path ?? undefined,
    visitDay: r.visit_day ?? undefined,
    driverId: r.driver_id ?? undefined,
    attempts,
    log: [], // loaded on demand by fetchHistory()
    cancel:
      r.status === 'cancelled'
        ? {
            by: byStaff && r.cancelled_by ? { kind: 'user', userId: r.cancelled_by } : { kind: 'branch', name: r.contact_name ?? '' },
            reason: r.cancel_reason_id ? (REASONS[r.cancel_reason_id] ?? { ar: '—', en: '—' }) : byStaff ? { ar: 'أخرى', en: 'Other' } : { ar: 'ألغاه الفرع', en: 'Cancelled by the branch' },
            note: r.cancel_note ?? undefined,
            fromStatus: r.driver_id ? 'scheduled' : 'waiting',
          }
        : undefined,
    close: r.status === 'closed' ? { by: r.closed_by ?? '', reason: r.closed_reason ?? '—', at: r.updated_at } : undefined,
    decisionSince: r.decision_since ?? undefined,
    draftCancelled: r.draft_cancelled,
    branch: {
      id: r.branch_id,
      chain: r.chain_code,
      number: r.branch_number,
      city: r.city_code,
      district: r.district_id,
      active: true,
      phone: r.branch_phone,
      hasLogin: true,
      name: r.branch_name,
      address: r.branch_address,
      accessNotes: r.branch_access_notes,
      lat: r.lat,
      lng: r.lng,
    },
  };
}

/** Open requests (any age) + everything created in the last REQUEST_WINDOW_DAYS, newest first. */
export async function fetchRequests(): Promise<RequestRow[]> {
  const since = sinceDay();
  const [list, attempts] = await Promise.all([
    all<ListRow>((a, b) =>
      supabase
        .from('request_list')
        .select(LIST_COLUMNS)
        .or(`status.in.(waiting,scheduled,needs_decision),created_at.gte.${since}`)
        .order('created_at', { ascending: false })
        .order('id')
        .range(a, b) as unknown as PromiseLike<Result<ListRow[]>>,
    ),
    all<AttemptRow>((a, b) =>
      supabase
        .from('visit_attempts')
        .select('request_id, visit_day, recorded_at, driver_id, outcome, reason_id, reason_text, note, photo_path')
        .gte('visit_day', since)
        .order('recorded_at')
        .order('id')
        .range(a, b) as unknown as PromiseLike<Result<AttemptRow[]>>,
    ),
  ]);
  const byRequest = new Map<string, Attempt[]>();
  attempts.forEach((a) => byRequest.set(a.request_id, [...(byRequest.get(a.request_id) ?? []), toAttempt(a)]));
  return list.map((r) => {
    uuids.set(ref(r.number), r.id);
    return toRow(r, byRequest.get(r.id) ?? []);
  });
}

async function uuidOf(reference: string): Promise<string> {
  const known = uuids.get(reference);
  if (known) return known;
  const number = Number(reference.replace(/^REQ-/, ''));
  const row = (await run(supabase.from('requests').select('id').eq('number', number).maybeSingle())) as { id: string } | null;
  if (!row) throw new ApiError('NOT_FOUND');
  uuids.set(reference, row.id);
  return row.id;
}

/** Status history of one request (shown in the drawer). */
/**
 * A signed URL for a stored photo, or null when it cannot be made.
 *
 * `request-photos` is private, so a stored path is not something an `<img>` can load. Staff may
 * read every photo (`private.photo_access`) and never write one. An hour is far longer than anyone
 * keeps a drawer open, and short enough that a copied link stops working.
 *
 * Null rather than a throw: a photo that will not load is drawn as the placeholder, not as a
 * failure of the request it belongs to.
 */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from('request-photos').createSignedUrl(path, 60 * 60);
  return error ? null : data.signedUrl;
}

export async function fetchHistory(reference: string, branchLabelText: string): Promise<StatusChange[]> {
  const id = await uuidOf(reference);
  const events = await run(
    supabase.from('request_events').select('from_status, to_status, actor_kind, actor_id, note, created_at').eq('request_id', id).order('id'),
  );
  const driverUsers = [...new Set(events.filter((e) => e.actor_kind === 'driver' && e.actor_id).map((e) => e.actor_id as string))];
  const drivers = driverUsers.length ? await run(supabase.from('drivers').select('id, user_id').in('user_id', driverUsers)) : [];
  const driverOf = (userId: string) => drivers.find((d) => d.user_id === userId)?.id ?? '';
  return events.map((e) => {
    const actor: Actor =
      e.actor_kind === 'staff' && e.actor_id
        ? { kind: 'user', userId: e.actor_id }
        : e.actor_kind === 'driver' && e.actor_id
          ? { kind: 'driver', driverId: driverOf(e.actor_id) }
          : e.actor_kind === 'branch'
            ? { kind: 'branch', name: branchLabelText }
            : { kind: 'system' };
    const note = e.note && e.note !== 'no_result' ? e.note : undefined;
    return { at: e.created_at, from: e.from_status ?? 'new', to: e.to_status, actor, note };
  });
}

export async function fetchDrivers(): Promise<Driver[]> {
  const planDay = nextWorkingDay(opsToday());
  const [rows, off] = await Promise.all([
    run(supabase.from('drivers').select('id, user_id, full_name, full_name_en, phone, city_id, material_id, active').order('full_name')),
    run(supabase.from('driver_days_off').select('driver_id').eq('day', planDay)),
  ]);
  const offNext = new Set((off as { driver_id: string }[]).map((o) => o.driver_id));
  return (rows as { id: string; user_id: string | null; full_name: string; full_name_en: string | null; phone: string; city_id: string; material_id: string; active: boolean }[]).map((d) => ({
    id: d.id,
    userId: d.user_id,
    name: { ar: d.full_name, en: d.full_name_en || d.full_name },
    phone: d.phone,
    city: CODES.city[d.city_id] ?? '',
    material: CODES.material[d.material_id] ?? '',
    active: d.active,
    availableNextDay: !offNext.has(d.id),
    unavailableNote: offNext.has(d.id) ? { ar: 'إجازة', en: 'Day off' } : undefined,
  }));
}

export async function fetchBranches(): Promise<Branch[]> {
  const rows = await all((a, b) =>
    supabase
      .from('branches')
      .select('id, branch_number, name, address, access_notes, lat, lng, active, phone, user_id, chain_id, district_id')
      .order('id')
      .range(a, b),
  );
  return (rows as {
    id: string; branch_number: string; name: string | null; address: string | null; access_notes: string | null; lat: number | null; lng: number | null;
    active: boolean; phone: string | null; user_id: string | null; chain_id: string; district_id: string;
  }[]).map((b) => ({
    id: b.id,
    chain: CODES.chain[b.chain_id] ?? '',
    number: b.branch_number,
    city: DISTRICTS[b.district_id]?.city ?? '',
    district: b.district_id,
    active: b.active,
    phone: b.phone,
    hasLogin: !!b.user_id,
    userId: b.user_id,
    name: b.name,
    address: b.address,
    accessNotes: b.access_notes,
    lat: b.lat,
    lng: b.lng,
  }));
}

/** Dashboard users (for "approved by", "created by"). */
export async function fetchUsers(): Promise<(DashboardUser & { lastSignInAt: string | null; mustChangePassword: boolean })[]> {
  const rows = await run(supabase.rpc('staff_list_staff'));
  return (rows as StaffRow[]).map((r) => ({ ...toDashboardUser(r), lastSignInAt: r.last_sign_in_at, mustChangePassword: r.must_change_password }));
}

export interface StaffRow {
  id: string;
  email: string;
  phone: string | null;
  display_name: string;
  display_name_en: string | null;
  material_ids: string[];
  active: boolean;
  must_change_password: boolean;
  last_sign_in_at: string | null;
}

export async function fetchApprovals(): Promise<PlanApproval[]> {
  const rows = await all((a, b) =>
    supabase.from('plan_approvals').select('visit_day, driver_id, approved_by, approved_at').gte('visit_day', sinceDay()).order('id').range(a, b),
  );
  return rows.map((r) => ({ day: r.visit_day, driverId: r.driver_id, userId: r.approved_by, at: r.approved_at }));
}

export interface LateBranchRef {
  branchId: string;
  /** Days since the last request; null = never sent one. */
  lastDays: number | null;
}

/** Active branches with no request for more than a week (any material). */
export async function fetchLateBranches(): Promise<LateBranchRef[]> {
  const rows = await run(supabase.rpc('staff_late_branches', {}));
  return (rows as { branch_id: string; days_since: number | null }[]).map((r) => ({ branchId: r.branch_id, lastDays: r.days_since }));
}

const KINDS: NotificationKind[] = ['stale_decisions', 'branch_cancelled', 'visit_failed', 'partial_pickup', 'visit_no_result', 'plan_completed'];

/** The signed-in user's notifications (the database already scoped them to the user's material). */
export async function fetchNotifications(): Promise<AppNotification[]> {
  const rows = await run(
    supabase.from('notifications').select('id, kind, title_ar, title_en, body_ar, body_en, link, material_id, read_at, created_at').order('created_at', { ascending: false }).limit(50),
  );
  return rows.map((n) => ({
    id: String(n.id),
    kind: (KINDS as string[]).includes(n.kind) ? (n.kind as NotificationKind) : 'other',
    title: { ar: n.title_ar, en: n.title_en },
    detail: { ar: n.body_ar ?? '', en: n.body_en ?? n.body_ar ?? '' },
    createdAt: n.created_at,
    read: !!n.read_at,
    material: n.material_id ? (CODES.material[n.material_id] ?? null) : null,
    href: n.link ?? '/',
  }));
}

// ---------------------------------------------------------------- writes

export class DuplicateRequestError extends ApiError {
  constructor(public existingId: string) {
    super('DUPLICATE_OPEN_REQUEST', existingId);
  }
}

export interface NewRequestInput {
  branchId: string;
  material: MaterialCode;
  subtype: SubtypeCode | null;
  kg: number | null;
  note: string;
}

/** Create a request on behalf of a branch. The database enforces one open request per branch per material subtype. */
export async function createRequest(input: NewRequestInput): Promise<{ id: string }> {
  try {
    const res = (await run(
      supabase.rpc('staff_create_request', {
        p_branch_id: input.branchId,
        p_material_id: IDS.material[input.material],
        p_subtype_id: input.subtype ? IDS.subtype[input.subtype] : null,
        p_kg: input.kg,
        p_note: input.note || null,
      }),
    )) as { id: string; number: number };
    uuids.set(ref(res.number), res.id);
    return { id: ref(res.number) };
  } catch (e) {
    if (e instanceof ApiError && e.code === 'DUPLICATE_OPEN_REQUEST') throw new DuplicateRequestError(ref(Number(e.detail)));
    throw e;
  }
}

/** Ops cancels a waiting or scheduled request. A listed reason, or "Other" with a typed note. */
export async function cancelRequest(reference: string, reason: Reason | null, note: string) {
  await run(supabase.rpc('staff_cancel_request', { p_request_id: await uuidOf(reference), p_reason_id: reason?.id ?? null, p_note: note || null }));
}

export interface ApprovePlanInput {
  day: DayKey;
  /** request reference → driverId */
  assignments: Record<string, string>;
  /** Draft-cancelled requests shown in this queue; they are cleared from the queue on approval. */
  clearDraftCancelled: string[];
}

/** Approve (or add to) the plan for the next working day. */
export async function approvePlan(input: ApprovePlanInput) {
  const assignments = await Promise.all(
    Object.entries(input.assignments).map(async ([reference, driverId]) => ({ request_id: await uuidOf(reference), driver_id: driverId })),
  );
  const clear = await Promise.all(input.clearDraftCancelled.map(uuidOf));
  const res = (await run(
    supabase.rpc('staff_approve_plan', { p_visit_day: input.day, p_assignments: assignments, p_clear_draft_cancelled: clear }),
  )) as { scheduled: number; drivers: number; skipped: string[] };
  return res;
}

/** Move every not-yet-visited request of a driver's plan for a day to another driver (same material + city). */
export async function changePlanDriver(day: DayKey, fromDriverId: string, toDriverId: string) {
  return (await run(supabase.rpc('staff_change_plan_driver', { p_visit_day: day, p_from_driver: fromDriverId, p_to_driver: toDriverId }))) as number;
}

export type Decision = { kind: 'reschedule'; note: string } | { kind: 'close'; reason: Reason | string };

/** Decide on a "needs decision" request: back to the scheduling queue, or close it for good. */
export async function decide(reference: string, decision: Decision) {
  const id = await uuidOf(reference);
  if (decision.kind === 'reschedule') {
    await run(supabase.rpc('staff_decide', { p_request_id: id, p_decision: 'reschedule', p_reason_id: null, p_text: decision.note || null }));
  } else {
    const r = decision.reason;
    await run(
      supabase.rpc('staff_decide', {
        p_request_id: id,
        p_decision: 'close',
        p_reason_id: typeof r === 'string' ? null : r.id,
        p_text: typeof r === 'string' ? r : null,
      }),
    );
  }
}

/** Undo a reschedule made by the same user in the last 15 minutes. */
export async function undoDecision(reference: string) {
  await run(supabase.rpc('staff_undo_reschedule', { p_request_id: await uuidOf(reference) }));
}

export async function markAllNotificationsRead() {
  await run(supabase.rpc('mark_notifications_read'));
}

export type { LocalizedText };
