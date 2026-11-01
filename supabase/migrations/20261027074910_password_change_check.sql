-- Clouds Water Ecosystem — 16: complete_password_change checks the password really changed
-- Until now it only cleared must_change_password, so an app (or someone calling the API by hand) could clear the flag
-- and keep the 6-digit temporary password. set_temp_password now remembers the temporary hash; complete_password_change
-- refuses (PASSWORD_NOT_CHANGED) while the account still has that hash. Accounts reset before this migration have no
-- remembered hash and behave as before.

create table private.temp_passwords (
  user_id uuid primary key references auth.users (id) on delete cascade,
  hash text not null,
  issued_at timestamptz not null default now()
);
alter table private.temp_passwords enable row level security;
revoke all on private.temp_passwords from public, anon, authenticated;

create or replace function public.set_temp_password(p_user_id uuid, p_password text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_email text;
  v_hash text;
begin
  if p_password !~ '^[0-9]{6}$' then raise exception 'INVALID_TEMP_PASSWORD'; end if;
  v_hash := extensions.crypt(p_password, extensions.gen_salt('bf', 10));
  update auth.users set encrypted_password = v_hash, updated_at = now()
  where id = p_user_id
  returning lower(email) into v_email;
  if v_email is null then raise exception 'NOT_FOUND'; end if;
  insert into private.temp_passwords (user_id, hash) values (p_user_id, v_hash)
  on conflict (user_id) do update set hash = excluded.hash, issued_at = now();
  update public.profiles set must_change_password = true where id = p_user_id;
  delete from private.login_attempts where login = v_email; -- a reset also lifts a lock
end $$;

-- Called by the apps right after supabase.auth.updateUser({ password }) on first sign-in.
create or replace function public.complete_password_change() returns void
language plpgsql security definer set search_path = '' as $$
begin
  if exists (
    select 1 from private.temp_passwords t join auth.users u on u.id = t.user_id
    where t.user_id = auth.uid() and u.encrypted_password = t.hash
  ) then
    raise exception 'PASSWORD_NOT_CHANGED';
  end if;
  delete from private.temp_passwords where user_id = auth.uid();
  update public.profiles set must_change_password = false where id = auth.uid();
end $$;
