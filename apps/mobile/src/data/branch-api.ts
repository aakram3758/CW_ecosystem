/**
 * Everything the branch app reads from and writes to Supabase, with no React in it.
 *
 * Same shape as the dashboard's `src/data/api.ts` on purpose — plain async functions that take and
 * return rows, with the hooks and the caching a layer above in `src/branch/state.tsx`. One person
 * reads both apps.
 *
 * **Reads go through RLS, every write goes through an RPC.** A branch's policies already limit
 * every table below to its own rows, so none of these fetchers filters by branch id: asking for
 * `request_list` returns this branch's requests and nothing else. The writes are
 * `SECURITY DEFINER` functions that enforce the rules — the 5,000 kg ceiling, one open request per
 * material, a pin that can only be set once — and raise UPPER_SNAKE codes that `src/data/errors.ts`
 * turns into the designed sentences.
 */

import { supabase } from '@/data/supabase';
import type { Database } from '@/data/database.types';
import type {
  AttemptRow, BranchRow, ChainRow, CityRow, CreateRequestArgs, DistrictRow, EditRequestArgs,
  EventRow, MaterialRow, NotificationRow, ReasonRow, RequestListRow, SubtypeRow,
} from '@/data/rows';
import type { Photo } from '@/data/device';

/** The private bucket both roles' photos live in. The branch may only write under its own folder. */
const PHOTO_BUCKET = 'request-photos';

/**
 * Who this branch is: its own row plus the three reference rows the account and home screens show
 * by name. One query with nested selects rather than four, because the screens never want one
 * without the others and a nested select is a single round trip.
 */
export type BranchContext = {
  branch: BranchRow;
  chain: ChainRow;
  district: DistrictRow;
  city: CityRow;
};

/** The reference tables, which every signed-in user may read, and the unified operations number. */
export type Reference = {
  materials: MaterialRow[];
  subtypes: SubtypeRow[];
  reasons: ReasonRow[];
  /** `app_settings.ops_phone`, or null when ops has not set one — then the contact button hides. */
  opsPhone: string | null;
};

/**
 * The branch's own row with `chains`, `districts` and the district's `cities` nested.
 *
 * Postgrest returns a nested one-to-one as an object, so the select is
 * `'*, chains(*), districts(*, cities(*))'` and the result needs unwrapping into `BranchContext`.
 * Exactly one row: a branch account maps to one branch by `user_id`, and RLS sees only that one, so
 * `.single()` is right and a missing row is a real error rather than an empty state.
 */
export async function fetchBranchContext(): Promise<BranchContext> {
  const { data, error } = await supabase.from('branches').select('*, chains(*), districts(*, cities(*))').single();
  if (error) throw error;
  const { chains: chain, districts, ...branch } = data;
  const { cities: city, ...district } = districts;
  return { branch, chain, district, city };
}

/**
 * Every request of this branch, newest first, from the `request_list` view.
 *
 * The view already carries what three screens need and the mock was shaped after it: the material
 * and subtype names in both languages, the material's colours, the last visit's outcome, day,
 * reason and note, the closing reason, and the branch's own details. No joins here.
 *
 * `order('created_at', { ascending: false })` — the home screen and the list both read newest
 * first, and the details screen is looked up by id out of the same array.
 */
export async function fetchRequests(): Promise<RequestListRow[]> {
  const { data, error } = await supabase.from('request_list').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * The history behind this branch's requests: `request_events` and `visit_attempts`.
 *
 * Both whole, not per request. The details screen wants one request's timeline, but RLS already
 * limits these to the branch's own rows, there are a handful per request, and fetching them
 * together keeps `data.events` and `data.attempts` the plain arrays every screen already filters —
 * which is what lets the screens stay as bite 2 wrote them. If a branch ever has enough history
 * for this to matter, it becomes a per-request query keyed by the open request.
 *
 * Sorted oldest first, the order the timeline is drawn in.
 */
export async function fetchTimeline(): Promise<{ events: EventRow[]; attempts: AttemptRow[] }> {
  const [events, attempts] = await Promise.all([
    supabase.from('request_events').select('*').order('created_at'),
    supabase.from('visit_attempts').select('*').order('recorded_at'),
  ]);
  if (events.error) throw events.error;
  if (attempts.error) throw attempts.error;
  return { events: events.data, attempts: attempts.data };
}

/**
 * Materials, subtypes, reasons and the operations number.
 *
 * Only `active` materials and subtypes — the create screen must not offer a material ops has
 * switched off. Reasons come whole, including inactive ones: a request's history can point at a
 * reason that has since been retired, and the label still has to render.
 *
 * Materials and reasons are ordered by their `sort_order`, which is what ops arranges them with.
 * **Subtypes have no `sort_order` column** — only the materials do — so they go by `created_at`,
 * which is the order the dashboard reads them in too (`apps/dashboard/src/data/api.ts`) and which
 * in practice is the order ops added them in. Both apps therefore draw one material's subtypes in
 * the same order.
 *
 * `app_settings` is a key/value table; the ops phone is the row with key `'ops_phone'`, and a
 * missing row or a null value both mean "no number", which is a state the screens draw.
 */
export async function fetchReference(): Promise<Reference> {
  const [materials, subtypes, reasons, phone] = await Promise.all([
    supabase.from('materials').select('*').eq('active', true).order('sort_order'),
    supabase.from('material_subtypes').select('*').eq('active', true).order('created_at'),
    supabase.from('reasons').select('*').order('sort_order'),
    supabase.from('app_settings').select('value').eq('key', 'ops_phone').maybeSingle(),
  ]);
  if (materials.error) throw materials.error;
  if (subtypes.error) throw subtypes.error;
  if (reasons.error) throw reasons.error;
  if (phone.error) throw phone.error;
  return { materials: materials.data, subtypes: subtypes.data, reasons: reasons.data,
    opsPhone: typeof phone.data?.value === 'string' ? phone.data.value : null };
}

/** This user's notifications, newest first. RLS limits them to `user_id = auth.uid()`. */
export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/**
 * Confirm the branch's location — once.
 *
 * `branch_set_location` raises `LOCATION_ALREADY_SET` if the pin has already been confirmed
 * (migration 17), which the app should never provoke: it only shows the location screen when
 * `location_confirmed_at` is null. If it is raised anyway — two devices on the same shared account,
 * both on the map — the honest answer is to refetch the context and go home, because the pin the
 * other device set is the branch's pin now.
 */
export async function setLocation(lat: number, lng: number): Promise<void> {
  const { error } = await supabase.rpc('branch_set_location', { p_lat: lat, p_lng: lng });
  if (error) throw error;
}

/**
 * Create a request. Returns the new row's id and number, which the success screen shows.
 *
 * The RPC returns `json_build_object('id', …, 'number', …)`, so the result comes back as `Json` and
 * has to be narrowed here rather than trusted — a generated `Json` return is not a promise about
 * its shape.
 */
export async function createRequest(args: CreateRequestArgs): Promise<{ id: string; number: number }> {
  // The alias follows SQL nullability; only the generated argument type needs narrowing.
  const { data, error } = await supabase.rpc('branch_create_request', args as Database['public']['Functions']['branch_create_request']['Args']);
  if (error) throw error;
  if (!data || typeof data !== 'object' || Array.isArray(data)
    || typeof data.id !== 'string' || typeof data.number !== 'number') throw new Error('INVALID_RESPONSE');
  return { id: data.id, number: data.number };
}

/** Edit a waiting request. Raises `INVALID_STATUS` once a visit day is set. */
export async function updateRequest(args: EditRequestArgs): Promise<void> {
  const { error } = await supabase.rpc('branch_update_request', args as Database['public']['Functions']['branch_update_request']['Args']);
  if (error) throw error;
}

/** Cancel a waiting request. Raises `INVALID_STATUS` once a visit day is set. */
export async function cancelRequest(requestId: string): Promise<void> {
  const { error } = await supabase.rpc('branch_cancel_request', { p_request_id: requestId });
  if (error) throw error;
}

/** Mark every unread notification of this user read. Takes no arguments; the RPC uses `auth.uid()`. */
export async function markNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read');
  if (error) throw error;
}

/**
 * Upload the scale photo, and return the path to hand to the RPC.
 *
 * **The file goes up before the row is written.** `branch_create_request` stores a path, and a row
 * pointing at a file that failed to upload is worse than no row: the details screen would show a
 * broken photo for a request that is otherwise fine. So this runs first and the caller only calls
 * the RPC once it has a path.
 *
 * The path is `branch/<branch_id>/<something unique>.jpg`, which is the shape
 * `private.photo_access` allows a branch to write — it checks the second segment against the
 * caller's own branch and refuses any other folder. The unique part is a timestamp and a short
 * random suffix rather than the original filename, which can repeat and can carry anything.
 *
 * React Native has no `File`. The upload body is an `ArrayBuffer` read from the local URI with
 * `fetch(photo.uri)` — `FormData` and `Blob` both have gaps on Android here — with
 * `contentType: 'image/jpeg'` stated explicitly, since storage infers `application/octet-stream`
 * without it and the image then downloads instead of rendering.
 *
 * No resizing: `expo-image-picker` is already asked for `quality: 0.7` in `device.ts`, which is why
 * `expo-image-manipulator` is not a dependency of this app despite the plan's stack list.
 */
export async function uploadScalePhoto(branchId: string, photo: Photo): Promise<string> {
  const body = await (await fetch(photo.uri)).arrayBuffer();
  const path = `branch/${branchId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.jpg`;
  const { error } = await supabase.storage.from(PHOTO_BUCKET).upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw error;
  return path;
}

/**
 * A signed URL for a stored photo, or null when it cannot be read.
 *
 * `request-photos` is private, so a stored path is not a URL and `<Image source={{ uri: path }}>`
 * would show nothing. An hour is far longer than anyone looks at one request and short enough that
 * a leaked link is worthless.
 *
 * Returns null rather than throwing: a photo that will not load is a thumbnail the screen draws
 * differently, not a failure of the screen.
 */
export async function signedPhotoUrl(path: string): Promise<string | null> {
  try {
    const { data, error } = await supabase.storage.from(PHOTO_BUCKET).createSignedUrl(path, 60 * 60);
    return error ? null : data?.signedUrl ?? null;
  } catch {
    return null;
  }
}
