import { ApiError, supabase, toApiError } from '../lib/supabase';
import { CODES, IDS, REF } from './catalog';
import type { CityCode, DayKey, LocalizedText, MaterialCode } from './types';

/**
 * Data access for the admin screens (chains & branches, cities & districts, drivers,
 * materials & managers, editable lists, reports). Reference tables are edited directly
 * (row level security lets only dashboard users write them); anything with rules goes through an RPC,
 * and logins go through the account Edge Functions.
 */

type Result<T> = { data: T | null; error: { message: string; code?: string; details?: string | null } | null };

async function run<T>(query: PromiseLike<Result<T>>): Promise<T> {
  let res: Result<T>;
  try {
    res = await query;
  } catch (e) {
    throw toApiError({ message: e instanceof Error ? e.message : String(e) });
  }
  if (res.error) {
    if (res.error.code === '23505') throw new ApiError('ALREADY_EXISTS', res.error.details ?? undefined);
    throw toApiError(res.error);
  }
  return res.data as T;
}

/** Latin key from an English name: "Al Danube Market" → "aldanubemarket" (chains) or "al_danube" (others). */
export const slug = (text: string, sep = '_', max = 20) =>
  text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, sep)
    .replace(new RegExp(`^\\${sep}+|\\${sep}+$`, 'g'), '')
    .slice(0, max);

function uniqueCode(base: string, taken: string[], fallback: string) {
  let code = base.length >= 2 ? base : fallback;
  let i = 2;
  while (taken.includes(code)) code = `${base.slice(0, 17)}${i++}`;
  return code;
}

// ---------------------------------------------------------------- accounts (Edge Functions)

export interface IssuedLogin {
  user_id?: string;
  login: string;
  temp_password: string;
}

async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let code = 'UNKNOWN';
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx && typeof ctx.json === 'function') code = ((await ctx.json()) as { error?: string }).error ?? code;
    } catch {
      /* not JSON */
    }
    if (code === 'UNKNOWN' && /Failed to fetch|NetworkError/i.test(error.message)) code = 'NETWORK';
    throw new ApiError(code);
  }
  return data as T;
}

export const createBranchLogin = (branchId: string) => callFunction<IssuedLogin>('create-account', { kind: 'branch', branch_id: branchId });
export const createDriverLogin = (driverId: string) => callFunction<IssuedLogin>('create-account', { kind: 'driver', driver_id: driverId });
export const createStaffLogin = (v: { name: string; nameEn?: string; phone: string; materials: MaterialCode[] }) =>
  callFunction<IssuedLogin>('create-account', {
    kind: 'staff',
    display_name: v.name,
    display_name_en: v.nameEn || null,
    phone: v.phone,
    material_ids: v.materials.map((m) => IDS.material[m]),
  });
export const resetPassword = (userId: string) => callFunction<IssuedLogin>('reset-password', { user_id: userId });

/** What a person types to sign in, from their login email. */
export function loginName(login: string): string {
  const m = /^(?:s|d)-(05[0-9]{8})@/.exec(login);
  if (m) return m[1];
  const b = /^b-([a-z0-9]+)-([0-9]+)@/.exec(login);
  if (b) return `${b[1]} ${b[2]}`;
  return login;
}

// ---------------------------------------------------------------- chains & branches

export interface BranchActivity {
  branch_id: string;
  last_request_at: string | null;
  open_requests: number;
  has_login: boolean;
  last_sign_in_at: string | null;
  must_change_password: boolean | null;
  user_id: string | null;
}

export const fetchBranchActivity = async () => (await run(supabase.rpc('staff_branch_overview'))) as BranchActivity[];

export async function createChain(v: { nameAr: string; nameEn: string; code: string }) {
  const code = v.code.trim().toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(code)) throw new ApiError('INVALID_CODE');
  await run(supabase.from('chains').insert({ code, name_ar: v.nameAr.trim(), name_en: v.nameEn.trim() || v.nameAr.trim() }));
  return code;
}

export interface BranchInput {
  chain: string; // chain code
  number: string;
  name: string;
  districtId: string;
  address: string;
  phone: string;
  accessNotes: string;
}

const branchRow = (v: BranchInput) => ({
  chain_id: IDS.chain[v.chain],
  branch_number: v.number.trim(),
  name: v.name.trim(),
  district_id: v.districtId,
  address: v.address.trim() || null,
  phone: v.phone.trim() || null,
  access_notes: v.accessNotes.trim() || null,
});

export async function createBranch(v: BranchInput): Promise<string> {
  const row = (await run(supabase.from('branches').insert(branchRow(v)).select('id').single())) as { id: string };
  return row.id;
}

export async function updateBranch(id: string, v: BranchInput) {
  await run(supabase.from('branches').update(branchRow(v)).eq('id', id));
}

export async function setBranchActive(id: string, active: boolean) {
  await run(supabase.from('branches').update({ active }).eq('id', id));
}

/** Location set from the dashboard counts as confirmed (the branch can send requests). */
export async function setBranchLocation(id: string, lat: number, lng: number) {
  await run(supabase.from('branches').update({ lat, lng, location_confirmed_at: new Date().toISOString() }).eq('id', id));
}

// ---------------------------------------------------------------- cities & districts

export async function addCity(v: { nameAr: string; nameEn: string; districts: LocalizedText[] }) {
  const rows = REF.rows!;
  const code = uniqueCode(slug(v.nameEn), rows.cities.map((c) => c.code), `c${rows.cities.length + 1}`);
  const sort = Math.max(0, ...rows.cities.map((c) => c.sort_order)) + 1;
  const city = (await run(supabase.from('cities').insert({ code, name_ar: v.nameAr, name_en: v.nameEn, sort_order: sort }).select('id').single())) as { id: string };
  if (v.districts.length) await addDistricts(city.id, v.districts);
  return code as CityCode;
}

export async function addDistricts(cityId: string, list: LocalizedText[]) {
  await run(supabase.from('districts').insert(list.map((d) => ({ city_id: cityId, name_ar: d.ar.trim(), name_en: (d.en || d.ar).trim() }))));
}

export async function renameDistrict(id: string, v: LocalizedText) {
  await run(supabase.from('districts').update({ name_ar: v.ar.trim(), name_en: (v.en || v.ar).trim() }).eq('id', id));
}

export async function setDistrictActive(id: string, active: boolean) {
  await run(supabase.from('districts').update({ active }).eq('id', id));
}

// ---------------------------------------------------------------- drivers

export interface DriverActivity {
  driver_id: string;
  has_login: boolean;
  last_sign_in_at: string | null;
  must_change_password: boolean | null;
  visits_today: number;
  visits_next: number;
  off_today: boolean;
  off_next: boolean;
  user_id: string | null;
}

export const fetchDriverActivity = async () => (await run(supabase.rpc('staff_driver_overview'))) as DriverActivity[];

export async function createDriver(v: { name: string; nameEn: string; phone: string; city: CityCode; material: MaterialCode }): Promise<string> {
  const row = (await run(
    supabase
      .from('drivers')
      .insert({ full_name: v.name.trim(), full_name_en: v.nameEn.trim() || null, phone: v.phone.trim(), city_id: IDS.city[v.city], material_id: IDS.material[v.material] })
      .select('id')
      .single(),
  )) as { id: string };
  return row.id;
}

export async function updateDriver(id: string, v: { name: string; nameEn: string; phone: string; city: CityCode; material: MaterialCode }) {
  await run(
    supabase
      .from('drivers')
      .update({ full_name: v.name.trim(), full_name_en: v.nameEn.trim() || null, phone: v.phone.trim(), city_id: IDS.city[v.city], material_id: IDS.material[v.material] })
      .eq('id', id),
  );
}

export async function setDriverActive(id: string, active: boolean) {
  await run(supabase.from('drivers').update({ active }).eq('id', id));
}

/** Working / day off for one day. Returns the driver's scheduled visits that day. */
export async function setDriverDay(id: string, day: DayKey, working: boolean) {
  return (await run(supabase.rpc('staff_set_driver_day', { p_driver_id: id, p_day: day, p_working: working }))) as number;
}

// ---------------------------------------------------------------- materials & managers

export const MATERIAL_PALETTE = [
  { light: '#6B4FBF', dark: '#A592F0', name: { ar: 'بنفسجي', en: 'Violet' } },
  { light: '#B23A6B', dark: '#E681AC', name: { ar: 'وردي', en: 'Pink' } },
  { light: '#6E7A1F', dark: '#B5C24F', name: { ar: 'زيتي', en: 'Olive' } },
  { light: '#8A5A1F', dark: '#D4A35F', name: { ar: 'بني فاتح', en: 'Tan' } },
  { light: '#2D6A8A', dark: '#6FB3D6', name: { ar: 'أزرق بحري', en: 'Sea blue' } },
  { light: '#9A3F2E', dark: '#E08A78', name: { ar: 'طوبي', en: 'Brick' } },
];

export async function createMaterial(v: { nameAr: string; nameEn: string; light: string; dark: string; managerId: string; phone: string }) {
  const rows = REF.rows!;
  const code = uniqueCode(slug(v.nameEn), rows.materials.map((m) => m.code), `m${rows.materials.length + 1}`);
  const sort = Math.max(0, ...rows.materials.map((m) => m.sort_order)) + 1;
  await run(
    supabase.from('materials').insert({
      code,
      name_ar: v.nameAr.trim(),
      name_en: v.nameEn.trim() || v.nameAr.trim(),
      color_light: v.light,
      color_dark: v.dark,
      icon: 'crate',
      sort_order: sort,
      manager_id: v.managerId || null,
      contact_phone: v.phone.trim() || null,
    }),
  );
  return code as MaterialCode;
}

export async function addSubtype(material: MaterialCode, v: LocalizedText) {
  const rows = REF.rows!;
  const base = `${material}_${slug(v.en || '', '_', 12)}`.replace(/_$/, '');
  const code = uniqueCode(base.length > material.length + 1 ? base : `${material}_t`, rows.subtypes.map((s) => s.code), `${material}_t`);
  await run(supabase.from('material_subtypes').insert({ material_id: IDS.material[material], code, name_ar: v.ar.trim(), name_en: (v.en || v.ar).trim() }));
}

export async function setSubtypeActive(code: string, active: boolean) {
  await run(supabase.from('material_subtypes').update({ active }).eq('id', IDS.subtype[code]));
}

export async function setMaterialManager(material: MaterialCode, managerId: string | null, phone: string) {
  await run(supabase.rpc('staff_set_material_manager', { p_material_id: IDS.material[material], p_manager_id: managerId, p_contact_phone: phone || null }));
}

export async function updateStaff(userId: string, v: { name: string; nameEn: string; materials: MaterialCode[] }) {
  await run(
    supabase.rpc('staff_update_staff', {
      p_user_id: userId,
      p_display_name: v.name,
      p_display_name_en: v.nameEn || null,
      p_material_ids: v.materials.map((m) => IDS.material[m]),
    }),
  );
}

export async function setAccountActive(userId: string, active: boolean) {
  await run(supabase.rpc('staff_set_account_active', { p_user_id: userId, p_active: active }));
}

export async function setOpsPhone(phone: string) {
  await run(supabase.from('app_settings').update({ value: phone.trim() || null, updated_at: new Date().toISOString() }).eq('key', 'ops_phone'));
}

// ---------------------------------------------------------------- editable lists

export type ReasonKind = 'failed' | 'partial' | 'close' | 'cancel';

export const fetchReasonUsage = async () => {
  const rows = (await run(supabase.rpc('staff_reason_usage'))) as { reason_id: string; uses: number }[];
  return Object.fromEntries(rows.map((r) => [r.reason_id, r.uses])) as Record<string, number>;
};

export async function addReason(kind: ReasonKind, v: LocalizedText) {
  const rows = REF.rows!.reasons.filter((r) => r.kind === kind);
  const sort = Math.max(0, ...rows.map((r) => r.sort_order)) + 1;
  await run(supabase.from('reasons').insert({ kind, label_ar: v.ar.trim(), label_en: (v.en || v.ar).trim(), sort_order: sort }));
}

export async function updateReason(id: string, v: LocalizedText) {
  await run(supabase.from('reasons').update({ label_ar: v.ar.trim(), label_en: (v.en || v.ar).trim() }).eq('id', id));
}

export async function setReasonActive(id: string, active: boolean) {
  await run(supabase.from('reasons').update({ active }).eq('id', id));
}

/** Saves a new order for one list (ids top to bottom). */
export async function reorderReasons(ids: string[]) {
  await Promise.all(ids.map((id, i) => run(supabase.from('reasons').update({ sort_order: i + 1 }).eq('id', id))));
}

// ---------------------------------------------------------------- reports

export interface ReportFilters {
  from: DayKey;
  to: DayKey;
  material: MaterialCode | 'all';
  city: CityCode | 'all';
  district: string | 'all';
  driver: string | 'all';
  chain: string | 'all';
}

export interface ReportCounts {
  requests: number;
  completed: number;
  closed: number;
  failed: number;
  kg: number;
}

export interface ReportData {
  workingDays: number;
  totals: { requests: number; completed: number; closed: number; failedVisits: number; visits: number; kg: number; trips: number };
  drivers: { id: string; name: LocalizedText; material: MaterialCode; city: CityCode; active: boolean; trips: number; daysOff: number; visits: number; failed: number; kg: number }[];
  groups: Record<'material' | 'city' | 'district' | 'chain' | 'branch' | 'driver', (ReportCounts & { key: string })[]>;
}

export async function fetchReport(f: ReportFilters): Promise<ReportData> {
  const raw = (await run(
    supabase.rpc('staff_report_v2', {
      p_from: f.from,
      p_to: f.to,
      p_material: f.material === 'all' ? null : IDS.material[f.material],
      p_city: f.city === 'all' ? null : IDS.city[f.city],
      p_district: f.district === 'all' ? null : f.district,
      p_driver: f.driver === 'all' ? null : f.driver,
      p_chain: f.chain === 'all' ? null : IDS.chain[f.chain],
    }),
  )) as {
    working_days: number;
    totals: { requests: number; completed: number; closed: number; failed_visits: number; visits: number; kg: number; trips: number };
    drivers: { id: string; full_name: string; full_name_en: string | null; material_id: string; city_id: string; active: boolean; trips: number; days_off: number; visits: number; failed: number; kg: number }[];
    groups: Record<string, { key: string | null; requests: number; completed: number; closed: number; failed: number; kg: number }[]>;
  };
  const num = (v: unknown) => Number(v ?? 0);
  const group = (k: string) =>
    (raw.groups[k] ?? [])
      .filter((g) => g.key)
      .map((g) => ({ key: g.key as string, requests: num(g.requests), completed: num(g.completed), closed: num(g.closed), failed: num(g.failed), kg: num(g.kg) }));
  return {
    workingDays: raw.working_days,
    totals: {
      requests: num(raw.totals.requests),
      completed: num(raw.totals.completed),
      closed: num(raw.totals.closed),
      failedVisits: num(raw.totals.failed_visits),
      visits: num(raw.totals.visits),
      kg: num(raw.totals.kg),
      trips: num(raw.totals.trips),
    },
    drivers: raw.drivers.map((d) => ({
      id: d.id,
      name: { ar: d.full_name, en: d.full_name_en || d.full_name },
      material: CODES.material[d.material_id] ?? '',
      city: CODES.city[d.city_id] ?? '',
      active: d.active,
      trips: num(d.trips),
      daysOff: num(d.days_off),
      visits: num(d.visits),
      failed: num(d.failed),
      kg: num(d.kg),
    })),
    groups: {
      material: group('material').map((g) => ({ ...g, key: CODES.material[g.key] ?? g.key })),
      city: group('city').map((g) => ({ ...g, key: CODES.city[g.key] ?? g.key })),
      district: group('district'),
      chain: group('chain').map((g) => ({ ...g, key: CODES.chain[g.key] ?? g.key })),
      branch: group('branch'),
      driver: group('driver'),
    },
  };
}
