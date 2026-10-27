// Creates a login for a dashboard user, a branch, or a driver. Staff only.
// POST { kind: 'staff', display_name, display_name_en?, phone?, email?, material_ids? }  — signs in with the mobile (or the email)
//      { kind: 'branch', branch_id }
//      { kind: 'driver', driver_id }
// → { user_id, login, temp_password }
import { admin, BRANCH_DOMAIN, cors, DRIVER_DOMAIN, json, requireStaff, STAFF_DOMAIN, tempPassword } from '../_shared/admin.ts';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'METHOD_NOT_ALLOWED' }, 405);

  const db = admin();
  const caller = await requireStaff(req, db);
  if ('error' in caller) return caller.error;

  let body: Record<string, string | string[] | null | undefined>;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'INVALID_BODY' }, 400);
  }

  let email: string;
  let profile: { role: 'staff' | 'branch' | 'driver'; display_name: string; display_name_en?: string | null; phone?: string | null };
  let link: { table: 'branches' | 'drivers'; id: string } | null = null;
  let materialIds: string[] = [];

  if (body.kind === 'staff') {
    const name = String(body.display_name ?? '').trim();
    const phone = String(body.phone ?? '').trim();
    const givenEmail = String(body.email ?? '').trim().toLowerCase();
    if (!name) return json({ error: 'NAME_REQUIRED' }, 400);
    if (phone && !/^05[0-9]{8}$/.test(phone)) return json({ error: 'INVALID_PHONE' }, 400);
    if (givenEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(givenEmail)) return json({ error: 'INVALID_EMAIL' }, 400);
    if (!phone && !givenEmail) return json({ error: 'PHONE_REQUIRED' }, 400);
    if (phone) {
      const { data: taken } = await db.from('profiles').select('id').eq('phone', phone).maybeSingle();
      if (taken) return json({ error: 'LOGIN_EXISTS' }, 409);
    }
    email = givenEmail || `s-${phone}@${STAFF_DOMAIN}`;
    profile = { role: 'staff', display_name: name, display_name_en: (body.display_name_en as string | undefined)?.trim() || null, phone: phone || null };
    materialIds = Array.isArray(body.material_ids) ? (body.material_ids as unknown as string[]) : [];
  } else if (body.kind === 'branch') {
    const { data: b } = await db
      .from('branches')
      .select('id, branch_number, user_id, chains(code, name_ar, name_en)')
      .eq('id', String(body.branch_id ?? ''))
      .maybeSingle();
    if (!b) return json({ error: 'NOT_FOUND' }, 404);
    if (b.user_id) return json({ error: 'ALREADY_HAS_LOGIN' }, 409);
    const chain = b.chains as unknown as { code: string; name_ar: string; name_en: string };
    email = `b-${chain.code}-${b.branch_number}@${BRANCH_DOMAIN}`;
    profile = { role: 'branch', display_name: `${chain.name_ar} #${b.branch_number}`, display_name_en: `${chain.name_en} #${b.branch_number}` };
    link = { table: 'branches', id: b.id };
  } else if (body.kind === 'driver') {
    const { data: d } = await db.from('drivers').select('id, phone, full_name, full_name_en, user_id').eq('id', String(body.driver_id ?? '')).maybeSingle();
    if (!d) return json({ error: 'NOT_FOUND' }, 404);
    if (d.user_id) return json({ error: 'ALREADY_HAS_LOGIN' }, 409);
    email = `d-${d.phone}@${DRIVER_DOMAIN}`;
    profile = { role: 'driver', display_name: d.full_name, display_name_en: d.full_name_en };
    link = { table: 'drivers', id: d.id };
  } else {
    return json({ error: 'INVALID_KIND' }, 400);
  }

  // No password here: Auth would reject 6 digits under the 8-char letters+digits rule (it sets a long random one).
  // The 6-digit temporary password is written by the database below.
  const { data: created, error: authError } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (authError || !created.user) {
    const exists = /already/i.test(authError?.message ?? '');
    return json({ error: exists ? 'LOGIN_EXISTS' : 'AUTH_ERROR', detail: authError?.message }, exists ? 409 : 500);
  }
  const userId = created.user.id;

  const { error: profileError } = await db.from('profiles').insert({ id: userId, ...profile, must_change_password: true });
  if (!profileError && link) {
    const { error: linkError } = await db.from(link.table).update({ user_id: userId }).eq('id', link.id).is('user_id', null);
    if (linkError) {
      await db.auth.admin.deleteUser(userId);
      return json({ error: 'LINK_FAILED', detail: linkError.message }, 500);
    }
  }
  if (profileError) {
    await db.auth.admin.deleteUser(userId); // keep auth and profiles in step
    return json({ error: 'PROFILE_FAILED', detail: profileError.message }, 500);
  }
  const password = tempPassword();
  const { error: passwordError } = await db.rpc('set_temp_password', { p_user_id: userId, p_password: password });
  if (passwordError) {
    await db.auth.admin.deleteUser(userId); // profile cascades; the branch/driver link is set back to null
    return json({ error: 'AUTH_ERROR', detail: passwordError.message }, 500);
  }
  if (materialIds.length) await db.from('materials').update({ manager_id: userId }).in('id', materialIds);

  return json({ user_id: userId, login: email, temp_password: password });
});
