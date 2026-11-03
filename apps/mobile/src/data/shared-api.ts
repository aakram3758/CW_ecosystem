import { supabase } from '@/data/supabase';
import type { NotificationRow } from '@/data/rows';
const PHOTO_BUCKET = 'request-photos';

/** This user's notifications, newest first. RLS limits them to `user_id = auth.uid()`. */
export async function fetchNotifications(): Promise<NotificationRow[]> {
  const { data, error } = await supabase.from('notifications').select('id, user_id, material_id, kind, title_ar, title_en, body_ar, body_en, link, request_id, read_at, created_at').order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

/** Mark every unread notification of this user read. Takes no arguments; the RPC uses `auth.uid()`. */
export async function markNotificationsRead(): Promise<void> {
  const { error } = await supabase.rpc('mark_notifications_read');
  if (error) throw error;
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
