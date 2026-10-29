-- End-to-end checks as staff / supervisor / branch / driver. Runs inside one transaction and rolls back.
\set ON_ERROR_STOP on
begin;

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
grant execute on all functions in schema pg_temp to authenticated;

-- accounts
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'gm@test'), ('00000000-0000-0000-0000-0000000000a2', 'sup@test'),
  ('00000000-0000-0000-0000-0000000000b1', 'b-othaim-207@branches.cloudswater.co'), ('00000000-0000-0000-0000-0000000000b2', 'b-panda-106@branches.cloudswater.co'),
  ('00000000-0000-0000-0000-0000000000d1', 'd-0551000001@drivers.cloudswater.co'), ('00000000-0000-0000-0000-0000000000d2', 'd-0551000002@drivers.cloudswater.co'),
  ('00000000-0000-0000-0000-0000000000e1', 'nobody@test');
-- this test owns the accounts: detach any existing logins from the rows it uses
update public.branches set user_id = null; update public.drivers set user_id = null;
update public.profiles set active = false where role = 'staff';
update public.materials set manager_id = null;
insert into public.profiles (id, role, display_name) values
  ('00000000-0000-0000-0000-0000000000a1', 'staff', 'مدير عام'),
  ('00000000-0000-0000-0000-0000000000a2', 'staff', 'مشرف بلاستيك'),
  ('00000000-0000-0000-0000-0000000000b1', 'branch', 'العثيم 207'),
  ('00000000-0000-0000-0000-0000000000b2', 'branch', 'بنده 106'),
  ('00000000-0000-0000-0000-0000000000d1', 'driver', 'أحمد سالم'),
  ('00000000-0000-0000-0000-0000000000d2', 'driver', 'خالد عمر');
update public.materials set manager_id = '00000000-0000-0000-0000-0000000000a2' where code = 'plas';
update public.branches set user_id = '00000000-0000-0000-0000-0000000000b1' where id = (select b.id from public.branches b join public.chains c on c.id = b.chain_id where c.code = 'othaim' and b.branch_number = '207');
update public.branches set user_id = '00000000-0000-0000-0000-0000000000b2' where id = (select b.id from public.branches b join public.chains c on c.id = b.chain_id where c.code = 'panda' and b.branch_number = '106');
update public.drivers set user_id = '00000000-0000-0000-0000-0000000000d1' where phone = '0551000001';
update public.drivers set user_id = '00000000-0000-0000-0000-0000000000d2' where phone = '0551000002';

create temp table ids as select
  (select id from public.materials where code = 'card') as card,
  (select id from public.materials where code = 'plas') as plas,
  (select id from public.material_subtypes where code = 'mix') as mix,
  (select id from public.material_subtypes where code = 'stretch') as stretch,
  (select id from public.cities where code = 'jed') as jed,
  (select b.id from public.branches b join public.chains c on c.id = b.chain_id where c.code = 'othaim' and b.branch_number = '207') as b207,
  (select b.id from public.branches b join public.chains c on c.id = b.chain_id where c.code = 'othaim' and b.branch_number = '212') as b212,
  (select id from public.drivers where phone = '0551000001') as d1,
  (select id from public.drivers where phone = '0551000002') as d2,
  (select id from public.drivers where phone = '0551000003') as d_plas,
  (select id from public.drivers where phone = '0551000006') as d_off,
  (select id from public.drivers where phone = '0551000007') as d_mak,
  (select id from public.reasons where kind = 'cancel' order by sort_order limit 1) as r_cancel,
  (select id from public.reasons where kind = 'close' order by sort_order limit 1) as r_close,
  (select id from public.reasons where kind = 'failed' order by sort_order limit 1) as r_failed,
  (select id from public.reasons where kind = 'partial' order by sort_order limit 1) as r_partial,
  private.next_working_day(private.ops_today()) as nwd;
grant select on ids to authenticated;
create temp table vars (k text primary key, v uuid);
grant all on vars to authenticated;

\echo '--- anonymous / no profile'
set local role anon;
select pg_temp.err('select * from public.requests', 'permission denied', 'anon cannot read requests');
reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
select pg_temp.ok((select count(*) from public.requests) = 0, 'signed-in user without profile sees no requests');
select pg_temp.ok((select count(*) from public.cities) = 0, 'no profile → no reference data');
select pg_temp.err('select public.staff_late_branches()', 'NOT_ALLOWED', 'no profile cannot call staff RPC');

\echo '--- general manager'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.ok((select count(*) from public.request_list) = (select count(*) from public.requests), 'GM sees every request in request_list');
select pg_temp.ok((select count(*) from public.staff_late_branches()) = 3, 'late branches = 3');

select pg_temp.ok((select count(*) from public.staff_list_staff() where active) = 2, 'staff list shows 2 active dashboard users');
select pg_temp.err('select public.staff_set_account_active(''00000000-0000-0000-0000-0000000000a1'', false)', 'CANNOT_DEACTIVATE_SELF', 'cannot deactivate yourself');
select public.staff_update_staff('00000000-0000-0000-0000-0000000000a2', 'مشرف البلاستيك', 'Plastic supervisor', array[(select plas from ids)]);
select pg_temp.ok((select material_ids from public.staff_list_staff() where id = '00000000-0000-0000-0000-0000000000a2') = array[(select plas from ids)], 'supervisor manages plastic');
select pg_temp.err('select public.staff_set_material_manager((select plas from ids), ''00000000-0000-0000-0000-0000000000a2'', ''12345'')', 'INVALID_PHONE', 'material contact phone validated');
select public.staff_set_material_manager((select plas from ids), '00000000-0000-0000-0000-0000000000a2', '0533300102');
select pg_temp.ok((select count(*) from public.staff_branch_overview()) = (select count(*) from public.branches), 'branch overview has every branch');
select pg_temp.ok((select count(*) from public.staff_driver_overview()) = (select count(*) from public.drivers), 'driver overview has every driver');
select pg_temp.ok((select count(*) from public.staff_reason_usage()) = (select count(*) from public.reasons), 'reason usage has every reason');
select pg_temp.ok((public.staff_report_v2(private.ops_today() - 30, private.ops_today()) -> 'totals' ->> 'kg')::numeric > 0, 'report v2 totals');
select pg_temp.ok(json_array_length(public.staff_report_v2(private.ops_today() - 30, private.ops_today()) -> 'drivers') = (select count(*) from public.drivers), 'report v2 drivers');
select pg_temp.ok(public.staff_set_driver_day((select d2 from ids), (select nwd from ids), false) = 0, 'driver day off (no visits)');
select pg_temp.err(format('select public.staff_approve_plan(%L, %L::jsonb)', (select nwd from ids), '[{"request_id":"' || (select r.id from public.requests r where r.number = 10003) || '","driver_id":"' || (select d2 from ids) || '"}]'), 'DRIVER_UNAVAILABLE', 'driver on leave cannot be planned');
select public.staff_set_driver_day((select d2 from ids), (select nwd from ids), true);
select pg_temp.err(format('select public.staff_set_driver_day(%L, %L, false)', (select d2 from ids), private.ops_today() - 1), 'INVALID_DAY', 'cannot change past availability');

-- create from dashboard + duplicate lock
insert into vars select 'r1', (public.staff_create_request((select b212 from ids), (select plas from ids), (select mix from ids), 33, 'من لوحة التحكم') ->> 'id')::uuid;
select pg_temp.ok((select created_via from public.requests where id = (select v from vars where k = 'r1')) = 'dashboard', 'staff created request');
select pg_temp.err(format('select public.staff_create_request(%L, %L, %L, 10, null)', (select b212 from ids), (select plas from ids), (select mix from ids)), 'DUPLICATE_OPEN_REQUEST', 'duplicate open request blocked');
select pg_temp.ok((public.staff_create_request((select b212 from ids), (select plas from ids), (select stretch from ids), 12, null) ->> 'number') is not null, 'other subtype allowed');
select pg_temp.err(format('select public.staff_create_request(%L, %L, null, 10, null)', (select b212 from ids), (select plas from ids)), 'SUBTYPE_REQUIRED', 'subtype required for plastic');
select pg_temp.err('insert into public.requests (branch_id, material_id) select b207, card from ids', 'permission denied', 'no direct insert into requests');
select pg_temp.err('delete from public.cities', 'permission denied', 'reference rows cannot be deleted');
select pg_temp.err('update public.requests set status = ''completed''', 'permission denied', 'no direct update of requests');

-- approve a plan for the next working day
select pg_temp.err(format('select public.staff_approve_plan(%L, %L::jsonb)', private.ops_today(), '[{"request_id":"' || (select v from vars where k='r1') || '","driver_id":"' || (select d_plas from ids) || '"}]'), 'INVALID_VISIT_DAY', 'plan must target next working day');
select pg_temp.err(format('select public.staff_approve_plan(%L, %L::jsonb)', (select nwd from ids), '[{"request_id":"' || (select v from vars where k='r1') || '","driver_id":"' || (select d1 from ids) || '"}]'), 'DRIVER_WRONG_MATERIAL', 'driver must match material');
select pg_temp.err(format('select public.staff_approve_plan(%L, %L::jsonb)', (select nwd from ids), '[{"request_id":"' || (select v from vars where k='r1') || '","driver_id":"' || (select d_off from ids) || '"}]'), 'DRIVER_', 'off / wrong driver rejected');
insert into vars select 'w1', (select r.id from public.requests r where r.branch_id = (select b207 from ids) and r.material_id = (select card from ids) and r.status = 'waiting');
select pg_temp.ok((public.staff_approve_plan((select nwd from ids),
  jsonb_build_array(jsonb_build_object('request_id', (select v from vars where k='r1'), 'driver_id', (select d_plas from ids)),
                    jsonb_build_object('request_id', (select v from vars where k='w1'), 'driver_id', (select d1 from ids)))) ->> 'scheduled')::int = 2, 'plan approved: 2 scheduled');
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='w1')) = 'scheduled', 'request is scheduled');
select pg_temp.ok((select count(*) from public.plan_approvals where visit_day = (select nwd from ids)) = 2, 'plan approvals recorded');
select pg_temp.ok((public.staff_change_plan_driver((select nwd from ids), (select d1 from ids), (select d2 from ids))) = 1, 'moved plan to another driver');
select pg_temp.ok((select driver_id from public.requests where id = (select v from vars where k='w1')) = (select d2 from ids), 'driver changed');
select pg_temp.err(format('select public.staff_change_plan_driver(%L, %L, %L)', (select nwd from ids), (select d2 from ids), (select d_mak from ids)), 'DRIVER_WRONG_CITY', 'change driver: wrong city blocked');

-- cancel needs a reason
select pg_temp.err(format('select public.staff_cancel_request(%L)', (select v from vars where k='r1')), 'REASON_REQUIRED', 'cancel without reason blocked');
select public.staff_cancel_request((select v from vars where k='r1'), (select r_cancel from ids));
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='r1')) = 'cancelled', 'staff cancelled scheduled request');

-- decisions: reschedule + undo, close with reason
insert into vars select 'nd1', (select id from public.requests where status = 'needs_decision' order by number limit 1);
insert into vars select 'nd2', (select id from public.requests where status = 'needs_decision' order by number offset 1 limit 1);
select public.staff_decide((select v from vars where k='nd1'), 'reschedule');
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='nd1')) = 'waiting', 'rescheduled → waiting');
select public.staff_undo_reschedule((select v from vars where k='nd1'));
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='nd1')) = 'needs_decision', 'undo → back to needs decision');
select pg_temp.err(format('select public.staff_decide(%L, ''close'')', (select v from vars where k='nd2')), 'REASON_REQUIRED', 'close needs a reason');
select public.staff_decide((select v from vars where k='nd2'), 'close', (select r_close from ids));
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='nd2')) = 'closed', 'closed with reason');

\echo '--- supervisor (plastic)'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select pg_temp.ok((select count(*) from public.request_list) = (select count(*) from public.requests), 'supervisor still sees all requests (GM permissions)');

\echo '--- branch (othaim 207)'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select pg_temp.ok((select count(*) from public.request_list) > 0 and not exists (select 1 from public.request_list where branch_id <> (select b207 from ids)), 'branch sees only its own requests');
select pg_temp.ok((select count(*) from public.branches) = 1, 'branch sees only its own branch row');
select pg_temp.ok((select count(*) from public.drivers) = 0, 'branch cannot list drivers');
select pg_temp.ok((select count(*) from public.profiles) = 1, 'branch sees only its own profile');
select pg_temp.err('select public.staff_late_branches()', 'NOT_ALLOWED', 'branch cannot call staff RPCs');
select pg_temp.err('select public.staff_set_account_active(''00000000-0000-0000-0000-0000000000a1'', false)', 'NOT_ALLOWED', 'branch cannot deactivate accounts');
select pg_temp.err(format('select public.branch_create_request(%L, null, 50, null, ''سعد'', ''0512345678'')', (select card from ids)), 'DUPLICATE_OPEN_REQUEST', 'branch duplicate blocked (card scheduled)');
select pg_temp.err(format('select public.branch_create_request(%L, null, 50, null, ''سعد'', ''12345'')', (select id from public.materials where code = 'bread')), 'INVALID_PHONE', 'phone format checked');
select pg_temp.err(format('select public.branch_create_request(%L, null, null, null, ''سعد'', ''0512345678'')', (select id from public.materials where code = 'bread')), 'KG_REQUIRED', 'kg required from branch');
-- Migration 18. The ceiling is checked before the duplicate test inside the function, so the
-- material does not have to be a free one for this to reach the weight.
select pg_temp.err(format('select public.branch_create_request(%L, null, 5001, null, ''سعد'', ''0512345678'')', (select id from public.materials where code = 'bread')), 'KG_TOO_LARGE', 'branch create refuses over 5,000 kg');
insert into vars select 'br1', (public.branch_create_request((select id from public.materials where code = 'bread'), null, 18, 'خلف المستودع', 'سعد', '0512345678', 'branch/' || (select b207 from ids) || '/a.jpg') ->> 'id')::uuid;
select public.branch_update_request((select v from vars where k='br1'), 22, null, 'سعد', '0512345678');
select pg_temp.ok((select kg from public.requests where id = (select v from vars where k='br1')) = 22, 'branch edited waiting request');
-- Migration 18, the other half: while br1 is still waiting, so this reaches the weight check rather
-- than INVALID_STATUS. Both functions needed the cap — an uncapped update could turn 50 kg into
-- 50,000 after the fact.
select pg_temp.err(format('select public.branch_update_request(%L, 5001, null, ''سعد'', ''0512345678'')', (select v from vars where k='br1')), 'KG_TOO_LARGE', 'branch update refuses over 5,000 kg');
select public.branch_cancel_request((select v from vars where k='br1'));
select pg_temp.ok((select draft_cancelled from public.requests where id = (select v from vars where k='br1')), 'branch cancel → struck-through in scheduling');
select pg_temp.err(format('select public.branch_cancel_request(%L)', (select v from vars where k='w1')), 'INVALID_STATUS', 'branch cannot cancel once scheduled');
select pg_temp.err(format('select public.branch_cancel_request(%L)', (select v from vars where k='nd1')), 'NOT_ALLOWED', 'branch cannot touch another branch request');
select pg_temp.ok(private.photo_access('branch/' || (select b207 from ids) || '/x.jpg', true), 'branch can upload to its own photo folder');
select pg_temp.ok(not private.photo_access('branch/' || (select b212 from ids) || '/x.jpg', true), 'branch cannot upload to another branch folder');
select pg_temp.ok((select count(*) from public.notifications) > 0, 'branch got notifications (visit scheduled)');
select public.mark_notifications_read();
select pg_temp.ok(not exists (select 1 from public.notifications where read_at is null), 'mark all read');
select pg_temp.err(format('select public.branch_set_location(%s, %s)', 100, 39), 'INVALID_LOCATION', 'location bounds checked');
-- Migration 17. Every seeded branch is confirmed, so even a valid pair is refused now. This has to
-- sit after the bounds check above, which is why the guard is the later of the two in the function.
select pg_temp.err(format('select public.branch_set_location(%s, %s)', 21.6, 39.2), 'LOCATION_ALREADY_SET', 'a confirmed branch cannot move its pin');

\echo '--- driver (Khaled, jed cardboard) — move the plan to today to simulate the visit day'
reset role;
update public.requests set visit_day = private.ops_today() where id = (select v from vars where k='w1');
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d2', true);
select pg_temp.ok((select count(*) from public.request_list) > 0 and not exists (select 1 from public.request_list where driver_id <> (select d2 from ids)), 'driver sees only assigned requests');
select pg_temp.ok((select count(*) from public.branches) = (select count(distinct branch_id) from public.request_list), 'driver sees only branches he is sent to');
select pg_temp.err(format('select public.driver_record_outcome(%L, ''full'')', (select v from vars where k='w1')), 'PHOTO_REQUIRED', 'photo required for full pickup');
select pg_temp.ok(private.photo_access('request/' || (select v from vars where k='w1') || '/p.jpg', true), 'driver can upload visit photo');
select pg_temp.ok(private.photo_access('branch/' || (select b207 from ids) || '/a.jpg', false) = false, 'driver cannot read unrelated branch photo');
select pg_temp.err(format('select public.driver_record_outcome(%L, ''failed'')', (select v from vars where k='w1')), 'REASON_REQUIRED', 'failed needs a reason');
select public.driver_record_outcome((select v from vars where k='w1'), 'partial', (select r_partial from ids), null, 'نصف الكمية', 'request/' || (select v from vars where k='w1') || '/p.jpg');
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='w1')) = 'needs_decision', 'partial → needs decision');
select pg_temp.err(format('select public.driver_record_outcome(%L, ''full'', null, null, null, ''x'')', (select v from vars where k='w1')), 'INVALID_STATUS', 'cannot record twice');

\echo '--- driver (Ahmed) cannot act on Khaled requests'
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000d1', true);
select pg_temp.err(format('select public.driver_record_outcome(%L, ''full'', null, null, null, ''x'')', (select v from vars where k='w1')), 'NOT_ALLOWED', 'other driver blocked');
insert into vars select 'today1', (select id from public.requests where driver_id = (select d1 from ids) and status = 'scheduled' and visit_day = private.ops_today() limit 1);
select public.driver_record_outcome((select v from vars where k='today1'), 'full', null, null, null, 'request/' || (select v from vars where k='today1') || '/f.jpg');
select pg_temp.ok((select status from public.requests where id = (select v from vars where k='today1')) = 'completed', 'full → completed');

\echo '--- end-of-day sweep + stale digest (system)'
reset role;
select pg_temp.ok(private.sweep_unrecorded_visits() >= 4, 'sweep moved unrecorded visits');
select pg_temp.ok(not exists (select 1 from public.requests where status = 'scheduled' and visit_day <= private.ops_today()), 'no scheduled visit left for today');
select private.notify_stale_decisions();
select pg_temp.ok(exists (select 1 from public.notifications where kind = 'stale_decisions' and user_id = '00000000-0000-0000-0000-0000000000a1'), 'GM got stale digest');
select pg_temp.ok((select count(*) from public.request_events where request_id = (select v from vars where k='w1')) >= 4, 'history kept for the request');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a2', true);
select pg_temp.ok((select count(*) from public.notifications where kind <> 'stale_decisions') > 0
  and not exists (select 1 from public.notifications where material_id <> (select plas from ids)), 'supervisor notifications only for plastic');
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000a1', true);
select pg_temp.ok(exists (select 1 from public.notifications where material_id = (select card from ids)), 'GM gets every material');
reset role;

select public.staff_set_account_active('00000000-0000-0000-0000-0000000000b1', false);
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000b1', true);
select pg_temp.ok((select count(*) from public.request_list) = 0, 'deactivated branch account sees nothing');
reset role;

\echo 'ALL CHECKS PASSED'
rollback;
