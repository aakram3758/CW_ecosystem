import type { Database } from '@/data/database.types';

type Tables = Database['public']['Tables'];
export type BranchRow = Tables['branches']['Row'];
export type MaterialRow = Tables['materials']['Row'];
export type SubtypeRow = Tables['material_subtypes']['Row'];
export type RequestRow = Tables['requests']['Row'];
export type RequestListRow = Database['public']['Views']['request_list']['Row'];
export type EventRow = Tables['request_events']['Row'];
export type AttemptRow = Tables['visit_attempts']['Row'];
export type NotificationRow = Tables['notifications']['Row'];
// The generator types every argument without a SQL default as required and non-null. The function
// itself is looser: p_subtype_id is null for a material with no active subtypes (SUBTYPE_REQUIRED is
// raised only when one exists), and p_note is nullable — the server runs nullif(trim(p_note), '').
// Widen those two so a screen can say "no subtype" without a cast; the SQL signature is the truth.
type CreateArgsRaw = Database['public']['Functions']['branch_create_request']['Args'];
export type CreateRequestArgs =
  Omit<CreateArgsRaw, 'p_subtype_id' | 'p_note'> & { p_subtype_id: string | null; p_note: string | null };

// Keep the prototype's calendar fixed so its next-visit card does not age between reviews.
export const mockToday = '2026-10-17';
export const mockNow = '2026-10-17T10:24:00+03:00';
const created_at = '2026-09-01T09:00:00+03:00';
const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
export const chain: Tables['chains']['Row'] = {
  id: id(1), code: 'panda', name_ar: 'بنده', name_en: 'Panda', active: true, created_at,
};
export const city: Tables['cities']['Row'] = {
  id: id(2), code: 'jeddah', name_ar: 'جدة', name_en: 'Jeddah', active: true, sort_order: 1, created_at,
};
export const district: Tables['districts']['Row'] = {
  id: id(3), city_id: city.id, name_ar: 'الصفا', name_en: 'Al Safa', active: true, created_at,
};
export const branch: BranchRow = {
  id: id(4), chain_id: chain.id, district_id: district.id, branch_number: '106',
  // `name_en` arrived with migration 19. The column is null for every real row until the dashboard
  // grows a field for it; the mock fills it so the English screens can be read while it is empty.
  name: 'بنده #106 – الصفا', name_en: 'Panda #106 – Al Safa',
  address: 'شارع الأمير ماجد، الصفا، جدة', active: true,
  lat: 21.5812, lng: 39.1689, location_confirmed_at: null, phone: '0552468135',
  user_id: id(5), access_notes: null, created_at,
};
export const opsPhone: Tables['app_settings']['Row'] = {
  key: 'ops_phone', value: '0552468100', updated_at: created_at,
};
export const photoPath = `branch/${branch.id}/scale-demo.jpg`;
export const materials: MaterialRow[] = [
  { id: id(10), code: 'card', name_ar: 'كرتون', name_en: 'Cardboard', icon: 'box', color_light: '#B5773A', color_dark: '#D89A5B', contact_phone: '0552468101', sort_order: 1 },
  { id: id(11), code: 'plas', name_ar: 'بلاستيك', name_en: 'Plastic', icon: 'bottle', color_light: '#1F6FB8', color_dark: '#5C9BE0', contact_phone: '0552468102', sort_order: 2 },
  { id: id(12), code: 'paper', name_ar: 'ورق', name_en: 'Paper', icon: 'paper', color_light: '#2F8A5B', color_dark: '#4FBF86', contact_phone: '0552468103', sort_order: 3 },
  { id: id(13), code: 'metal', name_ar: 'معادن', name_en: 'Metal', icon: 'hex', color_light: '#5C6B7E', color_dark: '#9AA9BC', contact_phone: '0552468104', sort_order: 4 },
  { id: id(14), code: 'bread', name_ar: 'خبز', name_en: 'Bread', icon: 'bread', color_light: '#138A8A', color_dark: '#3CC2C2', contact_phone: '0552468105', sort_order: 5 },
].map(row => ({ ...row, active: true, manager_id: null, created_at }));
export const subtypes: SubtypeRow[] = [
  { id: id(20), material_id: id(11), code: 'mix', name_ar: 'مكس', name_en: 'Mixed' },
  { id: id(21), material_id: id(11), code: 'stretch', name_ar: 'استرتش', name_en: 'Stretch film' },
  { id: id(22), material_id: id(13), code: 'iron', name_ar: 'حديد', name_en: 'Iron' },
  { id: id(23), material_id: id(13), code: 'copper', name_ar: 'نحاس', name_en: 'Copper' },
  { id: id(24), material_id: id(13), code: 'aluminium', name_ar: 'ألومنيوم', name_en: 'Aluminium' },
].map(row => ({ ...row, active: true, created_at }));
export const reasons: Tables['reasons']['Row'][] = [
  { id: id(30), kind: 'failed', label_ar: 'الفرع مغلق', label_en: 'branch closed', active: true, sort_order: 1, created_at },
  { id: id(31), kind: 'close', label_ar: 'المواد غير متوفرة بعد عدة محاولات', label_en: 'materials not available after several attempts', active: true, sort_order: 1, created_at },
];

function sampleRequest(number: number, material_id: string, kg: number, status: RequestRow['status'], at: string,
  patch: Partial<RequestRow> = {}): RequestRow {
  return {
    id: id(number), number, branch_id: branch.id, material_id, kg, status, created_at: at,
    updated_at: at, created_by: branch.user_id, created_via: 'branch', subtype_id: null,
    branch_photo_path: `branch/${branch.id}/${number}.jpg`, note: null, visit_day: null,
    contact_name: 'عبدالله السالم', contact_phone: '0552468135', driver_id: null, decision_since: null,
    cancel_note: null, cancel_reason_id: null, cancelled_by: null, closed_by: null,
    closed_reason: null, closed_reason_id: null, draft_cancelled: false, ...patch,
  };
}
export const requests: RequestRow[] = [
  sampleRequest(1042, id(10), 320, 'scheduled', '2026-10-14T09:12:00+03:00', { visit_day: '2026-10-20', driver_id: id(6), note: 'عند باب التحميل الخلفي', updated_at: '2026-10-17T09:10:00+03:00' }),
  sampleRequest(1039, id(11), 85, 'waiting', '2026-10-16T16:40:00+03:00', { subtype_id: id(21), branch_photo_path: null, contact_name: 'سعد العتيبي', contact_phone: '0508642135' }),
  sampleRequest(1031, id(14), 40, 'waiting', '2026-10-12T08:20:00+03:00', { contact_name: 'ناصر الغامدي', contact_phone: '0531357924' }),
  sampleRequest(1027, id(12), 150, 'needs_decision', '2026-10-11T13:30:00+03:00', { driver_id: id(6), visit_day: '2026-10-16', decision_since: '2026-10-16T12:30:00+03:00' }),
  sampleRequest(1018, id(13), 60, 'completed', '2026-10-06T10:05:00+03:00', { subtype_id: id(22), visit_day: '2026-10-12', driver_id: id(6), contact_name: 'سعد العتيبي', contact_phone: '0508642135' }),
  sampleRequest(1011, id(10), 410, 'completed', '2026-10-01T15:20:00+03:00', { visit_day: '2026-10-08', driver_id: id(6), contact_name: 'ناصر الغامدي', contact_phone: '0531357924' }),
  sampleRequest(1006, id(12), 90, 'closed', '2026-09-28T11:00:00+03:00', { closed_reason_id: id(31), closed_reason: reasons[1].label_ar, closed_by: id(7) }),
  sampleRequest(1002, id(11), 30, 'cancelled', '2026-09-25T09:40:00+03:00', { subtype_id: id(20), cancelled_by: branch.user_id, contact_name: 'سعد العتيبي', contact_phone: '0508642135' }),
];
function event(request: number, from_status: EventRow['from_status'], to_status: EventRow['to_status'],
  actor_kind: EventRow['actor_kind'], at: string, eventId: number): EventRow {
  return { id: eventId, request_id: id(request), from_status, to_status, actor_kind,
    actor_id: actor_kind === 'branch' ? branch.user_id : null, note: null, created_at: `${at}:00+03:00` };
}
export const events: EventRow[] = [
  ...requests.map((r, i): EventRow => ({ id: i + 1, request_id: r.id, from_status: null, to_status: 'waiting', actor_kind: 'branch', actor_id: branch.user_id, note: null, created_at: r.created_at })),
  event(1042, 'waiting', 'scheduled', 'staff', '2026-10-17T09:10', 10),
  event(1031, 'waiting', 'scheduled', 'staff', '2026-10-13T09:00', 11),
  event(1031, 'scheduled', 'needs_decision', 'driver', '2026-10-15T11:05', 12),
  event(1031, 'needs_decision', 'waiting', 'staff', '2026-10-15T11:08', 13),
  event(1027, 'waiting', 'scheduled', 'staff', '2026-10-13T09:00', 14),
  event(1027, 'scheduled', 'needs_decision', 'driver', '2026-10-16T12:30', 15),
  event(1018, 'waiting', 'scheduled', 'staff', '2026-10-08T09:00', 16),
  event(1018, 'scheduled', 'completed', 'driver', '2026-10-12T11:40', 17),
  event(1011, 'waiting', 'scheduled', 'staff', '2026-10-04T09:00', 18),
  event(1011, 'scheduled', 'completed', 'driver', '2026-10-08T10:15', 19),
  event(1006, 'waiting', 'scheduled', 'staff', '2026-09-30T09:00', 20),
  event(1006, 'scheduled', 'needs_decision', 'driver', '2026-10-05T12:10', 21),
  event(1006, 'needs_decision', 'closed', 'staff', '2026-10-09T14:00', 22),
  event(1002, 'waiting', 'cancelled', 'branch', '2026-09-25T15:10', 23),
];
export const attempts: AttemptRow[] = [
  { id: id(40), request_id: id(1031), outcome: 'failed', visit_day: '2026-10-15', recorded_at: '2026-10-15T11:05:00+03:00', reason_id: id(30) },
  { id: id(41), request_id: id(1027), outcome: 'partial', visit_day: '2026-10-16', recorded_at: '2026-10-16T12:30:00+03:00', reason_id: null },
  { id: id(42), request_id: id(1018), outcome: 'full', visit_day: '2026-10-12', recorded_at: '2026-10-12T11:40:00+03:00', reason_id: null },
  { id: id(43), request_id: id(1011), outcome: 'full', visit_day: '2026-10-08', recorded_at: '2026-10-08T10:15:00+03:00', reason_id: null },
  { id: id(44), request_id: id(1006), outcome: 'failed', visit_day: '2026-10-05', recorded_at: '2026-10-05T12:10:00+03:00', reason_id: id(30) },
].map(row => ({ ...row, outcome: row.outcome as AttemptRow['outcome'], driver_id: id(6), note: null, photo_path: null, reason_text: null }));

export function requestView(row: RequestRow): RequestListRow {
  const material = materials.find(m => m.id === row.material_id)!;
  const subtype = subtypes.find(s => s.id === row.subtype_id);
  const last = attempts.filter(a => a.request_id === row.id).sort((a, b) => b.recorded_at.localeCompare(a.recorded_at))[0];
  const reason = reasons.find(r => r.id === last?.reason_id);
  const { closed_reason_id: _closedReason, ...fields } = row;
  return { ...fields, branch_name: branch.name, branch_number: branch.branch_number,
    branch_address: branch.address, branch_access_notes: branch.access_notes, branch_phone: branch.phone,
    lat: branch.lat, lng: branch.lng, chain_id: chain.id, chain_code: chain.code,
    chain_name_ar: chain.name_ar, chain_name_en: chain.name_en, city_id: city.id,
    city_code: city.code, city_name_ar: city.name_ar, city_name_en: city.name_en,
    district_id: district.id, district_name_ar: district.name_ar, district_name_en: district.name_en,
    material_code: material.code, material_name_ar: material.name_ar, material_name_en: material.name_en,
    material_color_light: material.color_light, material_color_dark: material.color_dark,
    subtype_code: subtype?.code ?? null, subtype_name_ar: subtype?.name_ar ?? null, subtype_name_en: subtype?.name_en ?? null,
    driver_name: null, driver_name_en: null, driver_phone: null,
    last_outcome: last?.outcome ?? null, last_attempt_at: last?.recorded_at ?? null,
    last_attempt_day: last?.visit_day ?? null, last_attempt_driver_id: last?.driver_id ?? null,
    last_attempt_note: last?.note ?? null, last_attempt_photo: last?.photo_path ?? null,
    last_reason_ar: reason?.label_ar ?? null, last_reason_en: reason?.label_en ?? null };
}
export const requestList: RequestListRow[] = requests.map(requestView);

// Notifications are already bilingual rows, not sentences assembled by a screen.
export const notifications: NotificationRow[] = [
  { id: 6, request_id: id(1042), material_id: id(10), kind: 'sched', created_at: '2026-10-17T09:10:00+03:00', read_at: null, title_ar: 'تم تحديد يوم زيارة الكرتون', title_en: 'Cardboard visit day set', body_ar: 'الزيارة الثلاثاء 20 أكتوبر. الطلب 1042.', body_en: 'Visit on Tuesday, 20 Oct. Request 1042.' },
  { id: 5, request_id: id(1027), material_id: id(12), kind: 'mis', created_at: '2026-10-16T12:30:00+03:00', read_at: null, title_ar: 'طلب الورق لدى المدير', title_en: 'Paper request with the manager', body_ar: 'الكمية المستلمة في زيارة 16 أكتوبر لم تطابق الطلب.', body_en: 'The quantity collected on 16 Oct didn’t match the request.' },
  { id: 4, request_id: id(1031), material_id: id(14), kind: 'fail', created_at: '2026-10-15T11:05:00+03:00', read_at: mockNow, title_ar: 'تعذر استلام الخبز', title_en: 'Bread pickup failed', body_ar: 'زيارة 15 أكتوبر: الفرع مغلق. سنحدد يومًا جديدًا ونبلغكم.', body_en: '15 Oct visit: branch closed. We’ll set a new day and notify you.' },
  { id: 3, request_id: id(1018), material_id: id(13), kind: 'done', created_at: '2026-10-12T11:40:00+03:00', read_at: mockNow, title_ar: 'تم استلام المعادن', title_en: 'Metal collected', body_ar: 'اكتمل الطلب 1018 في زيارة 12 أكتوبر.', body_en: 'Request 1018 completed on the 12 Oct visit.' },
  { id: 2, request_id: id(1018), material_id: id(13), kind: 'morning', created_at: '2026-10-12T07:30:00+03:00', read_at: mockNow, title_ar: 'السائق يزوركم اليوم لاستلام المعادن', title_en: 'The driver visits today for Metal', body_ar: 'جهّزوا 60 كجم قرب منطقة التحميل.', body_en: 'Have 60 kg ready near the loading area.' },
  { id: 1, request_id: id(1006), material_id: id(12), kind: 'closed', created_at: '2026-10-09T14:00:00+03:00', read_at: mockNow, title_ar: 'أُغلق طلب الورق', title_en: 'Paper request closed', body_ar: 'السبب: المواد غير متوفرة بعد عدة محاولات.', body_en: 'Reason: materials not available after several attempts.' },
].map(row => ({ ...row, user_id: branch.user_id!, link: null }));

export function newRequest(args: CreateRequestArgs, number: number): RequestRow {
  return sampleRequest(number, args.p_material_id, args.p_kg, 'waiting', mockNow, {
    subtype_id: args.p_subtype_id ?? null, contact_name: args.p_contact_name ?? null,
    contact_phone: args.p_contact_phone ?? null, note: args.p_note ?? null, branch_photo_path: args.p_photo_path ?? null,
  });
}
