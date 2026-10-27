-- Checks for migrations 13–16: morning notice, login lockout, temporary passwords.
-- Paste into the SQL editor and run as one batch. It always ends with an error on purpose: the error rolls everything
-- back, and its message reads "ALL CHECKS PASSED" when every check passed (otherwise "FAIL: <check>").

create function pg_temp.ok(cond boolean, label text) returns void language plpgsql as $$
begin
  if cond is not true then raise exception 'FAIL: %', label; end if;
  raise notice 'ok  %', label;
end $$;
create function pg_temp.err(p_sql text, p_expect text, label text) returns void language plpgsql as $$
begin
  execute p_sql;
  raise exception 'FAIL (no error): %', label;
exception when others then
  if sqlerrm like 'FAIL%' then raise; end if;
  if position(p_expect in sqlerrm) = 0 then raise exception 'FAIL: % → got "%"', label, sqlerrm; end if;
  raise notice 'ok  % (%)', label, sqlerrm;
end $$;

-- ---------------------------------------------------------------- fixtures: one test branch with three requests
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000f0b1', 'b-test-999999@branches.cloudswater.co');
insert into public.profiles (id, role, display_name) values ('00000000-0000-0000-0000-00000000f0b1', 'branch', 'فرع اختبار');

create temp table fx as
select d.id as driver, d.material_id as m1,
       (select m.id from public.materials m where m.id <> d.material_id order by m.sort_order limit 1) as m2,
       (select id from public.chains order by created_at limit 1) as chain,
       (select id from public.districts where city_id = d.city_id order by created_at limit 1) as district
from public.drivers d order by d.created_at limit 1;

insert into public.branches (id, chain_id, branch_number, district_id, user_id)
select '00000000-0000-0000-0000-00000000fb01', chain, '999999', district, '00000000-0000-0000-0000-00000000f0b1' from fx;

-- today (scheduled) → notified · next working day (scheduled) → not yet · waiting → never
insert into public.requests (id, branch_id, material_id, status, visit_day, driver_id, created_via) select
  '00000000-0000-0000-0000-00000000fa01', '00000000-0000-0000-0000-00000000fb01', m1, 'scheduled', private.ops_today(), driver, 'dashboard' from fx;
insert into public.requests (id, branch_id, material_id, status, visit_day, driver_id, created_via) select
  '00000000-0000-0000-0000-00000000fa02', '00000000-0000-0000-0000-00000000fb01', m2, 'scheduled', private.next_working_day(private.ops_today()), driver, 'dashboard' from fx;

-- ---------------------------------------------------------------- 13: morning notice
create temp table before_run as select private.notify_visit_day_morning() as n;
select pg_temp.ok((select count(*) from public.notifications
  where user_id = '00000000-0000-0000-0000-00000000f0b1' and kind = 'visit_today' and request_id = '00000000-0000-0000-0000-00000000fa01') = 1,
  'branch with a visit today gets one morning notice');
select pg_temp.ok(not exists (select 1 from public.notifications where kind = 'visit_today' and request_id = '00000000-0000-0000-0000-00000000fa02'),
  'visit on another day: no notice');
select pg_temp.ok((select count(*) from public.notifications n join public.requests r on r.id = n.request_id
  where n.kind = 'visit_today' and (r.status <> 'scheduled' or r.visit_day <> private.ops_today())) = 0,
  'only scheduled visits for today are notified');
select pg_temp.ok((select title_ar from public.notifications where kind = 'visit_today' and request_id = '00000000-0000-0000-0000-00000000fa01') = 'موعد الاستلام اليوم'
  and (select body_ar from public.notifications where kind = 'visit_today' and request_id = '00000000-0000-0000-0000-00000000fa01') like '%#999999%',
  'notice text names the branch and material');
select pg_temp.ok(private.notify_visit_day_morning() = 0, 'second run the same day sends nothing');
select pg_temp.ok(exists (select 1 from cron.job where jobname = 'visit-day-morning-notice' and schedule = '0 5 * * *'),
  'cron at 05:00 UTC = 08:00 Riyadh');
select pg_temp.ok(not has_function_privilege('authenticated', 'private.notify_visit_day_morning()', 'EXECUTE'),
  'apps cannot trigger the morning notice');

-- ---------------------------------------------------------------- 14: login lockout
select pg_temp.ok(public.login_guard_check('nobody@test') = 0, 'unknown login is not locked');
select pg_temp.ok((public.login_guard_record('Lock@Test ', false) ->> 'attempts_left')::int = 4, '1st wrong password → 4 left (case + spaces ignored)');
select public.login_guard_record('lock@test', false);
select public.login_guard_record('lock@test', false);
select pg_temp.ok((public.login_guard_record('lock@test', false) ->> 'attempts_left')::int = 1, '4th wrong password → 1 left');
select pg_temp.ok(public.login_guard_check('lock@test') = 0, 'not locked after 4');
select pg_temp.ok((public.login_guard_record('lock@test', false) ->> 'locked_seconds')::int = 900, '5th wrong password locks for 15 minutes');
select pg_temp.ok(public.login_guard_check('LOCK@test') between 899 and 900, 'check reports the time left');

update private.login_attempts set locked_until = now() - interval '1 second', last_failed_at = now() - interval '15 minutes 1 second' where login = 'lock@test';
select pg_temp.ok(public.login_guard_check('lock@test') = 0, 'lock ends after 15 minutes');
select pg_temp.ok((public.login_guard_record('lock@test', false) ->> 'attempts_left')::int = 4, 'after the lock, counting starts again');

select public.login_guard_record('ok@test', false);
select public.login_guard_record('ok@test', false);
select public.login_guard_record('ok@test', true);
select pg_temp.ok(not exists (select 1 from private.login_attempts where login = 'ok@test'), 'a successful sign-in clears the counter');

select public.login_guard_record('old@test', false);
update private.login_attempts set failed_count = 4, last_failed_at = now() - interval '16 minutes' where login = 'old@test';
select pg_temp.ok((public.login_guard_record('old@test', false) ->> 'attempts_left')::int = 4, 'failures older than 15 minutes do not count');

select pg_temp.ok(not has_function_privilege('authenticated', 'public.login_guard_check(text)', 'EXECUTE')
  and not has_function_privilege('anon', 'public.login_guard_record(text, boolean)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.login_guard_record(text, boolean)', 'EXECUTE'),
  'lockout functions: service role only');

-- ---------------------------------------------------------------- 15: temporary passwords
update public.profiles set must_change_password = false where id = '00000000-0000-0000-0000-00000000f0b1';
select public.login_guard_record('b-test-999999@branches.cloudswater.co', false);
select public.set_temp_password('00000000-0000-0000-0000-00000000f0b1', '482913');
select pg_temp.ok((select encrypted_password = extensions.crypt('482913', encrypted_password) and encrypted_password like '$2a$10$%'
  from auth.users where id = '00000000-0000-0000-0000-00000000f0b1'), '6-digit temp password stored as bcrypt (what Auth checks)');
select pg_temp.ok((select must_change_password from public.profiles where id = '00000000-0000-0000-0000-00000000f0b1'), 'temp password forces a change at sign-in');
select pg_temp.ok(not exists (select 1 from private.login_attempts where login = 'b-test-999999@branches.cloudswater.co'), 'reset lifts a lock');
select pg_temp.err($$select public.set_temp_password('00000000-0000-0000-0000-00000000f0b1', 'abc12345')$$, 'INVALID_TEMP_PASSWORD', 'temp password must be 6 digits');
select pg_temp.err($$select public.set_temp_password('00000000-0000-0000-0000-00000000dead', '123456')$$, 'NOT_FOUND', 'unknown account');
select pg_temp.ok(not has_function_privilege('authenticated', 'public.set_temp_password(uuid, text)', 'EXECUTE')
  and has_function_privilege('service_role', 'public.set_temp_password(uuid, text)', 'EXECUTE'),
  'set_temp_password: service role only');

-- ---------------------------------------------------------------- 16: the temporary password must really be changed
grant execute on all functions in schema pg_temp to authenticated;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f0b1', true);
select pg_temp.err('select public.complete_password_change()', 'PASSWORD_NOT_CHANGED', 'cannot clear the flag while still on the temporary password');
reset role;
update auth.users set encrypted_password = extensions.crypt('NewPass2026', extensions.gen_salt('bf', 10)) where id = '00000000-0000-0000-0000-00000000f0b1'; -- what auth.updateUser does
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000f0b1', true);
select public.complete_password_change();
reset role;
select pg_temp.ok(not (select must_change_password from public.profiles where id = '00000000-0000-0000-0000-00000000f0b1')
  and not exists (select 1 from private.temp_passwords where user_id = '00000000-0000-0000-0000-00000000f0b1'),
  'after a real change the flag clears');

do $$ begin raise exception 'ALL CHECKS PASSED (rolled back on purpose)'; end $$;
