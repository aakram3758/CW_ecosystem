-- Clouds Water Ecosystem — 15: temporary passwords written by the database
-- Supabase Auth requires every password a user chooses to be 8+ characters with letters and digits
-- (Authentication → Email settings). The Auth admin API applies that rule too, so it can no longer set the
-- 6-digit temporary password. create-account and reset-password call this instead: it stores the bcrypt hash the
-- same way Auth does. Signing in with it still works; the app then forces a new password, which Auth checks.

create function public.set_temp_password(p_user_id uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_email text;
begin
  if p_password !~ '^[0-9]{6}$' then raise exception 'INVALID_TEMP_PASSWORD'; end if;
  update auth.users
  set encrypted_password = extensions.crypt(p_password, extensions.gen_salt('bf', 10)), updated_at = now()
  where id = p_user_id
  returning lower(email) into v_email;
  if v_email is null then raise exception 'NOT_FOUND'; end if;
  update public.profiles set must_change_password = true where id = p_user_id;
  delete from private.login_attempts where login = v_email; -- a reset also lifts a lock
end $$;

revoke all on function public.set_temp_password(uuid, text) from public, anon, authenticated;
grant execute on function public.set_temp_password(uuid, text) to service_role;
