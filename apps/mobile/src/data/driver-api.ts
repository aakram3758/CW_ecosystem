/** Driver reads and writes. Plans are scoped to the current assignment; history belongs to the attempt. */
import { File } from 'expo-file-system';
import { supabase } from '@/data/supabase';
import type { Database } from '@/data/database.types';
import type { DriverRow, MaterialRow, CityRow, RequestListRow, ReasonRow, AttemptRow } from '@/data/rows';
import type { Photo } from '@/data/device';

export type DriverContext = {
  driver: DriverRow & { materials: Pick<MaterialRow, 'code' | 'name_ar' | 'name_en' | 'color_light' | 'color_dark' | 'icon'> | null;
    cities: Pick<CityRow, 'name_ar' | 'name_en'> | null };
  opsPhone: string | null;
  offToday: boolean;
};

/** Own driver row, material, city, operations number and today's explicit day off. */
export async function fetchDriverContext(today: string): Promise<DriverContext> {
  const session = await supabase.auth.getSession();
  if (session.error) throw session.error;
  if (!session.data.session) throw new Error('NOT_ALLOWED');
  const driver = await supabase.from('drivers').select('id, user_id, full_name, full_name_en, phone, city_id, material_id, active, created_at, materials(code, name_ar, name_en, color_light, color_dark, icon), cities(name_ar, name_en)')
    .eq('user_id', session.data.session.user.id).single();
  if (driver.error) throw driver.error;
  const [phone, off] = await Promise.all([
    supabase.from('app_settings').select('value').eq('key', 'ops_phone').maybeSingle(),
    supabase.from('driver_days_off').select('driver_id').eq('driver_id', driver.data.id).eq('day', today).maybeSingle(),
  ]);
  if (phone.error) throw phone.error;
  if (off.error) throw off.error;
  return { driver: driver.data, opsPhone: typeof phone.data?.value === 'string' ? phone.data.value.trim() || null : null, offToday: !!off.data };
}

// Explicit columns keep the view contract reviewable. Shared by the plan and history reads below.
const REQUEST_COLUMNS = 'branch_access_notes, branch_address, branch_id, branch_name, branch_number, branch_phone, branch_photo_path, cancel_note, cancel_reason_id, cancelled_by, chain_code, chain_id, chain_name_ar, chain_name_en, city_code, city_id, city_name_ar, city_name_en, closed_by, closed_reason, contact_name, contact_phone, created_at, created_by, created_via, decision_since, district_id, district_name_ar, district_name_en, draft_cancelled, driver_id, driver_name, driver_name_en, driver_phone, id, kg, last_attempt_at, last_attempt_day, last_attempt_driver_id, last_attempt_note, last_attempt_photo, last_outcome, last_reason_ar, last_reason_en, lat, lng, material_code, material_color_dark, material_color_light, material_id, material_name_ar, material_name_en, note, number, status, subtype_code, subtype_id, subtype_name_ar, subtype_name_en, updated_at, visit_day' as const;

/** Today's assigned stops: scheduled, or recorded today. Migration 21 makes the driver filter essential. */
export async function fetchDay(driverId: string, day: string): Promise<RequestListRow[]> {
  const { data, error } = await supabase.from('request_list').select(REQUEST_COLUMNS)
    .eq('driver_id', driverId).eq('visit_day', day).or(`status.eq.scheduled,last_attempt_day.eq.${day}`)
    .order('chain_code').order('branch_number');
  if (error) throw error;
  return data;
}

/** Earliest future assignment and its newest approval. An assignment need not have an approval row. */
export async function fetchNextPlan(driverId: string, today: string): Promise<{ day: string; rows: RequestListRow[]; approvedAt: string | null } | null> {
  const first = await supabase.from('request_list').select('visit_day').eq('driver_id', driverId)
    .gt('visit_day', today).order('visit_day').limit(1).maybeSingle();
  if (first.error) throw first.error;
  const day = first.data?.visit_day;
  if (!day) return null;
  const [rows, approval] = await Promise.all([
    supabase.from('request_list').select(REQUEST_COLUMNS).eq('driver_id', driverId).eq('visit_day', day)
      .order('chain_code').order('branch_number'),
    supabase.from('plan_approvals').select('approved_at').eq('driver_id', driverId).eq('visit_day', day)
      .order('approved_at', { ascending: false }).limit(1).maybeSingle(),
  ]);
  if (rows.error) throw rows.error;
  if (approval.error) throw approval.error;
  return { day, rows: rows.data, approvedAt: approval.data?.approved_at ?? null };
}

/** Active failed and partial reasons in the order Operations chose. */
export async function fetchReasons(): Promise<ReasonRow[]> {
  const { data, error } = await supabase.from('reasons').select('id, kind, label_ar, label_en, active, sort_order, created_at')
    .eq('active', true).in('kind', ['failed', 'partial']).order('sort_order');
  if (error) throw error;
  return data;
}

export type HistoryVisit = { attempt: AttemptRow; request: RequestListRow | null; reason: Pick<ReasonRow, 'label_ar' | 'label_en'> | null };
/** Own attempts in the inclusive period, newest first. Missing requests remain visible; retired reasons retain their labels. */
export async function fetchHistory(driverId: string, from: string, to: string): Promise<HistoryVisit[]> {
  const attempts = await supabase.from('visit_attempts')
    .select('id, driver_id, request_id, outcome, visit_day, recorded_at, reason_id, reason_text, note, photo_path')
    .eq('driver_id', driverId).gte('visit_day', from).lte('visit_day', to).neq('outcome', 'no_result')
    .order('recorded_at', { ascending: false });
  if (attempts.error) throw attempts.error;
  if (!attempts.data.length) return [];
  const ids = [...new Set(attempts.data.map(a => a.request_id))];
  const reasonIds = [...new Set(attempts.data.flatMap(a => a.reason_id ? [a.reason_id] : []))];
  // Do not filter these request joins by current driver_id: the ownership filter is on attempts.
  const [requests, reasons] = await Promise.all([
    supabase.from('request_list').select(REQUEST_COLUMNS).in('id', ids),
    supabase.from('reasons').select('id, label_ar, label_en').in('id', reasonIds),
  ]);
  if (requests.error) throw requests.error;
  if (reasons.error) throw reasons.error;
  return attempts.data.map(attempt => ({ attempt, request: requests.data.find(r => r.id === attempt.request_id) ?? null,
    reason: reasons.data.find(r => r.id === attempt.reason_id) ?? null }));
}

/**
 * Whether this driver has ever recorded a visit. History needs it to tell its two empty states
 * apart: «لا توجد زيارات مسجّلة بعد» for a driver with none at all, and «لا توجد زيارات في هذه
 * الفترة» for one whose chosen period is empty.
 */
export async function hasHistory(driverId: string): Promise<boolean> {
  const { data, error } = await supabase.from('visit_attempts').select('id').eq('driver_id', driverId)
    .neq('outcome', 'no_result').limit(1);
  if (error) throw error;
  return data.length > 0;
}

/** Native file bytes, uploaded while still scheduled, before recording the outcome. */
export async function uploadOutcomePhoto(requestId: string, photo: Photo): Promise<string> {
  const body = await new File(photo.uri).arrayBuffer();
  // An object-name UUID, not a credential. No browser crypto API is assumed on the native runtime.
  const uuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const n = Math.floor(Math.random() * 16);
    return (c === 'x' ? n : (n & 3) | 8).toString(16);
  });
  const path = `request/${requestId}/${uuid}.jpg`;
  const { error } = await supabase.storage.from('request-photos').upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

export type RecordOutcomeArgs = { requestId: string; outcome: 'full' | 'partial' | 'failed';
  reasonId: string | null; reasonText: string | null; note: string | null; photoPath: string | null };
/** Server validates assignment, day, status, proof and reason; clear the draft only after this resolves. */
export async function recordOutcome(args: RecordOutcomeArgs): Promise<void> {
  const { error } = await supabase.rpc('driver_record_outcome', {
    p_request_id: args.requestId, p_outcome: args.outcome, p_reason_id: args.reasonId,
    p_reason_text: args.reasonText, p_note: args.note, p_photo_path: args.photoPath,
  } as Database['public']['Functions']['driver_record_outcome']['Args']);
  if (error) throw error;
}
