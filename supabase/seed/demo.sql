-- Demo data for trying the dashboard (branches, drivers, requests in every state, dated relative to today).
-- Safe to run once on an empty project. Branches and drivers have no login yet; create those from the dashboard.

create function pg_temp.br(p_chain text, p_number text) returns uuid language sql as $$
  select b.id from public.branches b join public.chains c on c.id = b.chain_id where c.code = p_chain and b.branch_number = p_number
$$;
create function pg_temp.mat(p text) returns uuid language sql as $$ select id from public.materials where code = p $$;
create function pg_temp.sub(p text) returns uuid language sql as $$ select id from public.material_subtypes where code = p $$;
create function pg_temp.drv(p text) returns uuid language sql as $$ select id from public.drivers where phone = p $$;

-- p_age_days: how many days ago the branch sent it; p_state: waiting | scheduled_today | done | partial | failed | no_result | stale | closed | cancelled | draft_cancelled
create function pg_temp.mk(p_chain text, p_number text, p_mat text, p_sub text, p_kg numeric, p_age_days int, p_state text, p_driver text default null)
returns void language plpgsql as $$
declare
  v_id uuid;
  v_today date := (now() at time zone 'Asia/Riyadh')::date;
  v_created timestamptz := now() - make_interval(days => p_age_days, hours => (p_kg::int % 7));
  v_visit date := case when p_state = 'scheduled_today' then v_today else v_today - greatest(p_age_days - 2, 0) end;
  v_status public.request_status;
begin
  v_status := case p_state
    when 'waiting' then 'waiting' when 'scheduled_today' then 'scheduled' when 'done' then 'completed'
    when 'closed' then 'closed' when 'cancelled' then 'cancelled' when 'draft_cancelled' then 'cancelled'
    else 'needs_decision' end;
  insert into public.requests (branch_id, material_id, subtype_id, kg, contact_name, contact_phone, status, visit_day, driver_id,
                               created_via, decision_since, draft_cancelled, created_at, closed_reason, cancel_note)
  values (pg_temp.br(p_chain, p_number), pg_temp.mat(p_mat), pg_temp.sub(p_sub), p_kg, 'مسؤول الاستلام', '0550000' || lpad(p_number, 3, '0'),
          v_status,
          case when p_state in ('waiting', 'cancelled', 'draft_cancelled') then null else v_visit end,
          case when p_state in ('waiting', 'cancelled', 'draft_cancelled') then null else pg_temp.drv(p_driver) end,
          'branch_app',
          case when v_status = 'needs_decision' then case when p_state = 'stale' then now() - interval '30 hours' else now() - interval '3 hours' end end,
          p_state = 'draft_cancelled', v_created,
          case when p_state = 'closed' then 'الكمية المتبقية صغيرة جدًا' end,
          case when p_state = 'cancelled' then 'طلب مكرر' end)
  returning id into v_id;

  insert into public.request_events (request_id, from_status, to_status, actor_kind, created_at) values (v_id, null, 'waiting', 'branch', v_created);
  if p_state not in ('waiting', 'cancelled', 'draft_cancelled') then
    insert into public.request_events (request_id, from_status, to_status, actor_kind, created_at)
    values (v_id, 'waiting', 'scheduled', 'staff', v_created + interval '20 hours');
  end if;
  if p_state in ('done', 'partial', 'failed', 'no_result', 'stale', 'closed') then
    insert into public.visit_attempts (request_id, visit_day, driver_id, outcome, reason_id, photo_path, recorded_at)
    values (v_id, v_visit, pg_temp.drv(p_driver),
            case p_state when 'done' then 'full' when 'closed' then 'partial' when 'stale' then 'failed' else p_state end::public.visit_outcome,
            case p_state
              when 'partial' then (select id from public.reasons where kind = 'partial' order by sort_order limit 1)
              when 'closed' then (select id from public.reasons where kind = 'partial' order by sort_order limit 1)
              when 'failed' then (select id from public.reasons where kind = 'failed' order by sort_order limit 1)
              when 'stale' then (select id from public.reasons where kind = 'failed' order by sort_order offset 2 limit 1)
            end,
            null, (v_visit + time '11:00') at time zone 'Asia/Riyadh');
    insert into public.request_events (request_id, from_status, to_status, actor_kind, created_at)
    values (v_id, 'scheduled', case when p_state = 'done' then 'completed' else 'needs_decision' end::public.request_status,
            case when p_state = 'no_result' then 'system' else 'driver' end::public.actor_kind, (v_visit + time '11:00') at time zone 'Asia/Riyadh');
  end if;
  if p_state = 'closed' then
    insert into public.request_events (request_id, from_status, to_status, actor_kind, note) values (v_id, 'needs_decision', 'closed', 'staff', 'الكمية المتبقية صغيرة جدًا');
  elsif p_state in ('cancelled', 'draft_cancelled') then
    insert into public.request_events (request_id, from_status, to_status, actor_kind) values (v_id, 'waiting', 'cancelled', case when p_state = 'draft_cancelled' then 'branch' else 'staff' end::public.actor_kind);
  end if;
end $$;

-- ---------------------------------------------------------------- branches
insert into public.branches (chain_id, branch_number, district_id, phone, lat, lng, location_confirmed_at)
select c.id, v.num, d.id, '05' || lpad((50000000 + v.num::int * 37)::text, 8, '0'), v.lat, v.lng, now() - interval '30 days'
from (values
  ('othaim', '207', 'الصفا', 21.5866, 39.2117), ('othaim', '212', 'السلامة', 21.5953, 39.1529), ('othaim', '219', 'الروضة', 21.5637, 39.1531),
  ('othaim', '231', 'المروة', 21.6249, 39.2058), ('othaim', '240', 'العزيزية', 21.4097, 39.8732), ('othaim', '305', 'الملقا', 24.8106, 46.6043),
  ('othaim', '318', 'النرجس', 24.8721, 46.6550),
  ('panda', '106', 'الصفا', 21.5811, 39.2242), ('panda', '114', 'الحمراء', 21.5294, 39.1653), ('panda', '121', 'النسيم', 21.5009, 39.2433),
  ('panda', '133', 'الشوقية', 21.3891, 39.8027), ('panda', '140', 'الزاهر', 21.4335, 39.8034), ('panda', '152', 'العليا', 24.6950, 46.6858),
  ('panda', '160', 'السليمانية', 24.7032, 46.7015),
  ('almarai', '12', 'الروضة', 21.5689, 39.1475), ('almarai', '18', 'المروة', 21.6302, 39.2111), ('almarai', '25', 'العزيزية', 21.4135, 39.8840),
  ('almarai', '31', 'الياسمين', 24.8277, 46.6420),
  ('othaim', '250', 'الزاهر', 21.4290, 39.8101), ('panda', '170', 'الياسمين', 24.8301, 46.6390), ('almarai', '40', 'الحمراء', 21.5320, 39.1700)
) v(chain, num, district, lat, lng)
join public.chains c on c.code = v.chain
join public.districts d on d.name_ar = v.district;

-- ---------------------------------------------------------------- drivers (one material + one city each)
insert into public.drivers (full_name, full_name_en, phone, city_id, material_id)
select v.ar, v.en, v.phone, c.id, m.id
from (values
  ('أحمد سالم', 'Ahmed Salem', '0551000001', 'jed', 'card', true, null),
  ('خالد عمر', 'Khaled Omar', '0551000002', 'jed', 'card', true, null),
  ('ياسر حسن', 'Yasser Hassan', '0551000003', 'jed', 'plas', true, null),
  ('سعيد علي', 'Saeed Ali', '0551000004', 'jed', 'paper', true, null),
  ('ماجد فهد', 'Majed Fahad', '0551000005', 'jed', 'metal', true, null),
  ('فيصل ناصر', 'Faisal Nasser', '0551000006', 'jed', 'bread', false, 'إجازة'),
  ('عمر يوسف', 'Omar Youssef', '0551000007', 'mak', 'card', true, null),
  ('حسن إبراهيم', 'Hassan Ibrahim', '0551000008', 'mak', 'plas', true, null),
  ('سلطان محمد', 'Sultan Mohammed', '0551000009', 'ruh', 'card', true, null),
  ('نايف عبدالله', 'Nayef Abdullah', '0551000010', 'ruh', 'plas', true, null),
  ('بدر سعد', 'Badr Saad', '0551000011', 'ruh', 'bread', true, null)
) v(ar, en, phone, city, mat, working, note)
join public.cities c on c.code = v.city
join public.materials m on m.code = v.mat;

-- Faisal is on leave on the next working day.
insert into public.driver_days_off (driver_id, day)
select id, private.next_working_day(private.ops_today()) from public.drivers where phone = '0551000006';

-- ---------------------------------------------------------------- requests
-- waiting (some older than 2 days)
select pg_temp.mk('othaim', '207', 'card', null, 120, 0, 'waiting');
select pg_temp.mk('othaim', '207', 'plas', 'stretch', 40, 1, 'waiting');
select pg_temp.mk('othaim', '212', 'card', null, 200, 3, 'waiting');
select pg_temp.mk('othaim', '219', 'paper', null, 60, 0, 'waiting');
select pg_temp.mk('panda', '106', 'card', null, 180, 1, 'waiting');
select pg_temp.mk('panda', '114', 'plas', 'mix', 55, 4, 'waiting');
select pg_temp.mk('panda', '121', 'metal', 'aluminium', 30, 0, 'waiting');
select pg_temp.mk('almarai', '12', 'bread', null, 25, 0, 'waiting');
select pg_temp.mk('almarai', '18', 'card', null, 90, 2, 'waiting');
select pg_temp.mk('othaim', '240', 'card', null, 150, 1, 'waiting');
select pg_temp.mk('panda', '133', 'plas', 'stretch', 35, 0, 'waiting');
select pg_temp.mk('othaim', '305', 'card', null, 210, 0, 'waiting');
select pg_temp.mk('panda', '152', 'plas', 'mix', 70, 2, 'waiting');
select pg_temp.mk('almarai', '31', 'bread', null, 20, 1, 'waiting');
-- scheduled for today
select pg_temp.mk('othaim', '231', 'card', null, 160, 3, 'scheduled_today', '0551000001');
select pg_temp.mk('panda', '106', 'plas', 'stretch', 45, 3, 'scheduled_today', '0551000003');
select pg_temp.mk('othaim', '219', 'card', null, 130, 2, 'scheduled_today', '0551000002');
select pg_temp.mk('almarai', '25', 'card', null, 110, 3, 'scheduled_today', '0551000007');
select pg_temp.mk('panda', '160', 'card', null, 95, 2, 'scheduled_today', '0551000009');
select pg_temp.mk('othaim', '318', 'plas', 'mix', 50, 3, 'scheduled_today', '0551000010');
-- needs decision
select pg_temp.mk('panda', '114', 'card', null, 140, 4, 'partial', '0551000001');
select pg_temp.mk('almarai', '12', 'paper', null, 80, 4, 'failed', '0551000004');
select pg_temp.mk('othaim', '212', 'metal', 'iron', 60, 3, 'no_result', '0551000005');
select pg_temp.mk('panda', '140', 'plas', 'mix', 40, 5, 'stale', '0551000008');
-- completed this week + older
select pg_temp.mk('othaim', '207', 'paper', null, 75, 4, 'done', '0551000004');
select pg_temp.mk('othaim', '212', 'plas', 'stretch', 60, 5, 'done', '0551000003');
select pg_temp.mk('panda', '121', 'card', null, 220, 6, 'done', '0551000002');
select pg_temp.mk('almarai', '18', 'bread', null, 30, 3, 'done', '0551000006');
select pg_temp.mk('othaim', '240', 'plas', 'mix', 45, 6, 'done', '0551000008');
select pg_temp.mk('panda', '133', 'card', null, 170, 4, 'done', '0551000007');
select pg_temp.mk('othaim', '305', 'plas', 'stretch', 65, 5, 'done', '0551000010');
select pg_temp.mk('panda', '152', 'card', null, 190, 4, 'done', '0551000009');
select pg_temp.mk('almarai', '31', 'card', null, 85, 7, 'done', '0551000009');
select pg_temp.mk('panda', '106', 'card', null, 150, 12, 'done', '0551000001');
select pg_temp.mk('othaim', '219', 'card', null, 140, 15, 'done', '0551000002');
-- closed / cancelled
select pg_temp.mk('almarai', '25', 'plas', 'mix', 15, 8, 'closed', '0551000008');
select pg_temp.mk('panda', '114', 'paper', null, 40, 2, 'cancelled');
select pg_temp.mk('othaim', '231', 'plas', 'mix', 30, 0, 'draft_cancelled');
-- late branches: nothing for over a week, or never
select pg_temp.mk('panda', '170', 'card', null, 120, 10, 'done', '0551000009');
select pg_temp.mk('almarai', '40', 'bread', null, 25, 9, 'done', '0551000006');
-- othaim 250 never sent a request
