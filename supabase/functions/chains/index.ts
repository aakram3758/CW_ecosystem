// The chain list for the branch side of the mobile app's sign-in screen.
// A branch signs in with chain + branch number, so it has to pick its chain before it has a session —
// and `anon` can't read anything in this database. Hence an Edge Function with the service role,
// rather than a grant to `anon`: one place to change, and the "anon reads nothing" rule stays true.
// GET (or POST, so a bare functions.invoke() works too)
//   200 { chains: [{ code, name_ar, name_en }] }  — active chains only, by Arabic name
// Deployed with verify_jwt = false: the caller has no session yet.
//
// Deliberately NOT returned: chain ids, inactive chains, and anything about branches. The app needs
// the code to build `b-<code>-<branch number>@branches.cloudswater.co` and the names to show the
// picker; nothing else belongs on a public endpoint.
import { admin, cors, json } from '../_shared/admin.ts';

const headers = {
  ...cors,
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
  // The list changes when ops add a chain, which is rare. Five minutes keeps the sign-in screen
  // instant on a repeat open and keeps this public endpoint cheap to hammer.
  'Cache-Control': 'public, max-age=300',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers });
  if (req.method !== 'GET' && req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const { data, error } = await admin()
    .from('chains')
    .select('code, name_ar, name_en')
    .eq('active', true)
    .order('name_ar');

  if (error) return json({ error: 'SERVER_ERROR' }, 500);

  return new Response(JSON.stringify({ chains: data ?? [] }), { status: 200, headers });
});
