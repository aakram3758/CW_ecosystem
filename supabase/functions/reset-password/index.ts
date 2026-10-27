// Issues a new 6-digit temporary password for any account. Staff only.
// POST { user_id } → { login, temp_password }
import { admin, cors, json, requireStaff, tempPassword } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const db = admin();
  const caller = await requireStaff(req, db);
  if ('error' in caller) return caller.error;

  let userId = '';
  try {
    userId = String((await req.json()).user_id ?? '');
  } catch {
    return json({ error: 'INVALID_BODY' }, 400);
  }

  const { data: profile } = await db.from('profiles').select('id').eq('id', userId).maybeSingle();
  if (!profile) return json({ error: 'NOT_FOUND' }, 404);

  // Written by the database: the Auth admin API would reject 6 digits under the 8-char letters+digits rule.
  // Also flags must_change_password and lifts a sign-in lock.
  const password = tempPassword();
  const { error } = await db.rpc('set_temp_password', { p_user_id: userId, p_password: password });
  if (error) return json({ error: 'AUTH_ERROR', detail: error.message }, 500);
  const { data } = await db.auth.admin.getUserById(userId);

  return json({ login: data.user?.email ?? null, temp_password: password });
});
