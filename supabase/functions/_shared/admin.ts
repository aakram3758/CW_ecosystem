import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.49.4';

export const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

/** Service-role client. Never leaves the function. */
export const admin = (): SupabaseClient =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

/** The caller must be an active dashboard user. Returns their id or a ready error response. */
export async function requireStaff(req: Request, db: SupabaseClient): Promise<{ userId: string } | { error: Response }> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return { error: json({ error: 'NOT_SIGNED_IN' }, 401) };
  const { data, error } = await db.auth.getUser(token);
  if (error || !data.user) return { error: json({ error: 'NOT_SIGNED_IN' }, 401) };
  const { data: profile } = await db.from('profiles').select('role, active').eq('id', data.user.id).maybeSingle();
  if (!profile || profile.role !== 'staff' || !profile.active) return { error: json({ error: 'NOT_ALLOWED' }, 403) };
  return { userId: data.user.id };
}

/** 6-digit temporary password; the user must change it at first sign-in. */
export function tempPassword(): string {
  const n = new Uint32Array(1);
  crypto.getRandomValues(n);
  return String(100000 + (n[0] % 900000));
}

export const BRANCH_DOMAIN = 'branches.cloudswater.co';
export const DRIVER_DOMAIN = 'drivers.cloudswater.co';
export const STAFF_DOMAIN = 'staff.cloudswater.co';
