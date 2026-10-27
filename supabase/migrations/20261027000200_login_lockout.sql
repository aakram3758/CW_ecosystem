-- Clouds Water Ecosystem — 14: lock a login for 15 minutes after 5 wrong passwords (branch + driver apps)
-- The Password Verification hook needs the Team plan (we are on Free), so the apps sign in through the `sign-in`
-- Edge Function, which asks login_guard_check before calling Supabase Auth and login_guard_record after.
-- Only the service role (inside the Edge Functions) can call them.

create table private.login_attempts (
  login text primary key, -- the sign-in email, lower-case
  failed_count int not null default 0,
  last_failed_at timestamptz,
  locked_until timestamptz
);
alter table private.login_attempts enable row level security;
revoke all on private.login_attempts from public, anon, authenticated;

-- Seconds left on the lock (0 = may try).
create function public.login_guard_check(p_login text) returns int
language sql stable security definer set search_path = '' as $$
  select coalesce((
    select greatest(0, ceil(extract(epoch from a.locked_until - now())))::int
    from private.login_attempts a where a.login = lower(trim(p_login))
  ), 0)
$$;

-- A success clears the counter. Failures older than 15 minutes don't count; the 5th one locks the login for 15 minutes.
create function public.login_guard_record(p_login text, p_ok boolean) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_login text := lower(trim(p_login));
  v_count int;
begin
  if p_ok then
    delete from private.login_attempts where login = v_login;
    return json_build_object('attempts_left', 5, 'locked_seconds', 0);
  end if;

  insert into private.login_attempts as a (login, failed_count, last_failed_at)
  values (v_login, 1, now())
  on conflict (login) do update set
    failed_count = case when a.last_failed_at < now() - interval '15 minutes' then 1 else a.failed_count + 1 end,
    last_failed_at = now()
  returning failed_count into v_count;

  if v_count >= 5 then
    update private.login_attempts set locked_until = now() + interval '15 minutes', failed_count = 0 where login = v_login;
    return json_build_object('attempts_left', 0, 'locked_seconds', 900);
  end if;
  return json_build_object('attempts_left', 5 - v_count, 'locked_seconds', 0);
end $$;

revoke all on function public.login_guard_check(text), public.login_guard_record(text, boolean) from public, anon, authenticated;
grant execute on function public.login_guard_check(text), public.login_guard_record(text, boolean) to service_role;
