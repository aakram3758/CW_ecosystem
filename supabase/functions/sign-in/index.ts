// Sign-in for the branch and driver apps, with a lock: 5 wrong passwords → the login is locked for 15 minutes.
// (Supabase's Password Verification hook would do this inside Auth, but it needs the Team plan.)
// POST { email, password }
//   200 { session: { access_token, refresh_token, expires_in, expires_at, token_type } } → app calls auth.setSession()
//   401 { error: 'INVALID_CREDENTIALS', attempts_left }
//   429 { error: 'LOCKED', retry_after }  (seconds)
// Deployed with verify_jwt = false: it is the sign-in itself, so the caller has no session yet.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0';
import { admin, cors, json } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  let email = '';
  let password = '';
  try {
    const body = await req.json();
    email = String(body.email ?? '').trim().toLowerCase();
    password = String(body.password ?? '');
  } catch {
    return json({ error: 'INVALID_BODY' }, 400);
  }
  if (!email || !password || email.length > 320 || password.length > 72) return json({ error: 'INVALID_CREDENTIALS' }, 401);

  const db = admin();
  const { data: wait, error: checkError } = await db.rpc('login_guard_check', { p_login: email });
  if (checkError) return json({ error: 'SERVER_ERROR' }, 500);
  if (wait > 0) return json({ error: 'LOCKED', retry_after: wait }, 429);

  const auth = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await auth.auth.signInWithPassword({ email, password });

  if (error) {
    // Only a wrong email/password counts towards the lock (not Auth rate limits or outages).
    if (error.code !== 'invalid_credentials') return json({ error: 'AUTH_ERROR', detail: error.message }, error.status ?? 500);
    const { data: r, error: recordError } = await db.rpc('login_guard_record', { p_login: email, p_ok: false });
    if (recordError) return json({ error: 'SERVER_ERROR' }, 500);
    return r.locked_seconds > 0
      ? json({ error: 'LOCKED', retry_after: r.locked_seconds }, 429)
      : json({ error: 'INVALID_CREDENTIALS', attempts_left: r.attempts_left }, 401);
  }

  await db.rpc('login_guard_record', { p_login: email, p_ok: true });
  const s = data.session!;
  return json({
    session: {
      access_token: s.access_token,
      refresh_token: s.refresh_token,
      expires_in: s.expires_in,
      expires_at: s.expires_at,
      token_type: s.token_type,
    },
  });
});
