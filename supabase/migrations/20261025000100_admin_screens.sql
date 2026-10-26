-- Clouds Water Ecosystem — 11: what the admin screens need
--   branches: display name, address, access notes (shown to the driver)
--   materials: one manager per material + the "contact the manager" number
--   staff can sign in with a mobile number (like drivers)
--   driver availability per day (replaces drivers.working) — feeds planning and the leave-days report
--   requests.closed_reason_id — so the lists screen can show how often each close reason was used
--   admin read models: branch overview, account sign-ins, reason usage, reports v2

-- ---------------------------------------------------------------- settings

create table public.app_settings (
  key text primary key,
  value text,
  updated_at timestamptz not null default now()
);
alter table public.app_settings enable row level security;
create policy app_settings_read on public.app_settings for select to authenticated using ((select private.my_role()) is not null);
create policy app_settings_staff_write on public.app_settings for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));
revoke insert, delete, truncate on public.app_settings from authenticated;
-- Unified operations number branches call when a material has no manager. Set the real number from the dashboard.
insert into public.app_settings (key, value) values ('ops_phone', null);

-- ---------------------------------------------------------------- branches

alter table public.branches
  add column name text,
  add column address text,
  add column access_notes text;
alter table public.branches add constraint branches_phone_format check (phone is null or phone ~ '^05[0-9]{8}$');

-- Demo / existing rows: the branch name defaults to its district.
update public.branches b set name = d.name_ar from public.districts d where d.id = b.district_id and b.name is null;

-- "بنده #106 – الصفا · كرتون" now uses the branch name (falls back to the district).
create or replace function private.request_label(p_request uuid, p_lang text) returns text
language sql stable security definer set search_path = '' as $$
  select case when p_lang = 'ar'
    then c.name_ar || ' #' || b.branch_number || ' – ' || coalesce(b.name, d.name_ar) || ' · ' || m.name_ar || coalesce(' · ' || s.name_ar, '')
    else c.name_en || ' #' || b.branch_number || ' – ' || coalesce(b.name, d.name_en) || ' · ' || m.name_en || coalesce(' · ' || s.name_en, '')
  end
  from public.requests r
  join public.branches b on b.id = r.branch_id
  join public.chains c on c.id = b.chain_id
  join public.districts d on d.id = b.district_id
  join public.materials m on m.id = r.material_id
  left join public.material_subtypes s on s.id = r.subtype_id
  where r.id = p_request
$$;

-- ---------------------------------------------------------------- staff: phone login + material managers

alter table public.profiles add column phone text;
alter table public.profiles add constraint profiles_phone_format check (phone is null or phone ~ '^05[0-9]{8}$');
create unique index profiles_staff_phone_key on public.profiles (phone) where phone is not null;

alter table public.materials
  add column manager_id uuid references public.profiles (id) on delete set null,
  add column contact_phone text check (contact_phone is null or contact_phone ~ '^(05[0-9]{8}|9200[0-9]{5})$');
create index materials_manager_idx on public.materials (manager_id);

-- Move the old "supervisor material" onto the material itself (one manager per material).
update public.materials m set manager_id = p.id
from public.profiles p where p.material_id = m.id and p.role = 'staff' and m.manager_id is null;

-- Notification scope: a manager gets their materials; staff who manage nothing (general managers) get everything.
create or replace function private.notify_staff(
  p_material uuid, p_kind text, p_title_ar text, p_title_en text,
  p_body_ar text, p_body_en text, p_link text, p_request uuid
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, link, request_id, material_id)
  select p.id, p_kind, p_title_ar, p_title_en, p_body_ar, p_body_en, p_link, p_request, p_material
  from public.profiles p
  where p.role = 'staff' and p.active
    and (not exists (select 1 from public.materials m where m.manager_id = p.id)
         or exists (select 1 from public.materials m where m.manager_id = p.id and m.id = p_material))
$$;

create or replace function private.notify_stale_decisions() returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, link)
  select p.id, 'stale_decisions',
         s.n || ' بدون إجراء منذ أكثر من يوم', s.n || ' with no action for over a day',
         'في «يحتاج قرار»', 'In "Needs decision"', '/decisions'
  from public.profiles p
  cross join lateral (
    select count(*) as n from public.requests r
    where r.status = 'needs_decision' and r.decision_since < now() - interval '24 hours'
      and (not exists (select 1 from public.materials m where m.manager_id = p.id)
           or r.material_id in (select m.id from public.materials m where m.manager_id = p.id))
  ) s
  where p.role = 'staff' and p.active and s.n > 0
$$;

drop function public.staff_update_staff(uuid, text, text, uuid);
drop function public.staff_list_staff();
alter table public.profiles drop constraint profiles_check;
alter table public.profiles drop column material_id;

-- Dashboard users with their login, last sign-in and the materials they manage.
create function public.staff_list_staff()
returns table (id uuid, email text, phone text, display_name text, display_name_en text, material_ids uuid[], active boolean,
               must_change_password boolean, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return query
  select p.id, u.email::text, p.phone, p.display_name, p.display_name_en,
         coalesce((select array_agg(m.id order by m.sort_order) from public.materials m where m.manager_id = p.id), '{}'),
         p.active, p.must_change_password, p.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'staff'
  order by p.active desc, p.display_name;
end $$;

-- Name / mobile of a dashboard user and the materials they manage (each material keeps one manager).
create function public.staff_update_staff(p_user_id uuid, p_display_name text, p_display_name_en text, p_material_ids uuid[])
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  if coalesce(trim(p_display_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  update public.profiles
  set display_name = trim(p_display_name), display_name_en = nullif(trim(p_display_name_en), '')
  where id = p_user_id and role = 'staff';
  if not found then raise exception 'NOT_FOUND'; end if;
  update public.materials set manager_id = null where manager_id = p_user_id and not (id = any (coalesce(p_material_ids, '{}')));
  update public.materials set manager_id = p_user_id where id = any (coalesce(p_material_ids, '{}'));
end $$;

-- Manager + contact number of one material. Without a manager the branches call the unified ops number.
create function public.staff_set_material_manager(p_material_id uuid, p_manager_id uuid, p_contact_phone text)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_phone text := nullif(trim(p_contact_phone), '');
begin
  perform private.require_staff();
  if p_manager_id is not null and not exists (select 1 from public.profiles where id = p_manager_id and role = 'staff' and active) then
    raise exception 'NOT_FOUND';
  end if;
  if v_phone is not null and v_phone !~ '^(05[0-9]{8}|9200[0-9]{5})$' then raise exception 'INVALID_PHONE'; end if;
  update public.materials set manager_id = p_manager_id, contact_phone = v_phone where id = p_material_id;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Deactivating a dashboard user also releases the materials they managed.
create or replace function public.staff_set_account_active(p_user_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  if p_user_id = auth.uid() and not p_active then raise exception 'CANNOT_DEACTIVATE_SELF'; end if;
  update public.profiles set active = p_active where id = p_user_id;
  if not found then raise exception 'NOT_FOUND'; end if;
  if not p_active then
    update public.materials set manager_id = null, contact_phone = null where manager_id = p_user_id;
  end if;
end $$;

-- ---------------------------------------------------------------- driver availability per day

create table public.driver_days_off (
  driver_id uuid not null references public.drivers (id) on delete cascade,
  day date not null,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  primary key (driver_id, day)
);
create index driver_days_off_day_idx on public.driver_days_off (day);
alter table public.driver_days_off enable row level security;
create policy driver_days_off_read on public.driver_days_off for select to authenticated
  using ((select private.is_staff()) or driver_id = (select private.my_driver_id()));
revoke insert, update, delete, truncate on public.driver_days_off from authenticated;

-- Carry over today's "not working" flags to the day being planned, then drop the old columns.
insert into public.driver_days_off (driver_id, day)
select id, private.next_working_day(private.ops_today()) from public.drivers where not working
on conflict do nothing;
alter table public.drivers drop column working, drop column unavailable_note;

create function private.driver_off(p_driver uuid, p_day date) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.driver_days_off o where o.driver_id = p_driver and o.day = p_day)
$$;

-- Mark a driver working / on leave for one day. Returns the scheduled visits he has that day (to warn ops).
create function public.staff_set_driver_day(p_driver_id uuid, p_day date, p_working boolean) returns int
language plpgsql security definer set search_path = '' as $$
declare v_visits int;
begin
  perform private.require_staff();
  if p_day < private.ops_today() then raise exception 'INVALID_DAY'; end if;
  if not exists (select 1 from public.drivers where id = p_driver_id) then raise exception 'NOT_FOUND'; end if;
  if p_working then
    delete from public.driver_days_off where driver_id = p_driver_id and day = p_day;
  else
    insert into public.driver_days_off (driver_id, day, created_by) values (p_driver_id, p_day, auth.uid()) on conflict do nothing;
  end if;
  select count(*) into v_visits from public.requests where driver_id = p_driver_id and visit_day = p_day and status = 'scheduled';
  return v_visits;
end $$;

-- Planning now checks the day-off table for the visit day.
create or replace function public.staff_approve_plan(p_visit_day date, p_assignments jsonb, p_clear_draft_cancelled uuid[] default '{}')
returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_item jsonb;
  v_req public.requests;
  v_driver public.drivers;
  v_city uuid;
  v_scheduled int := 0;
  v_skipped uuid[] := '{}';
  v_drivers uuid[] := '{}';
  v_d uuid;
  v_day_ar text := to_char(p_visit_day, 'DD/MM');
begin
  perform private.require_staff();
  if p_visit_day <> private.next_working_day(private.ops_today()) then raise exception 'INVALID_VISIT_DAY'; end if;
  if jsonb_typeof(p_assignments) <> 'array' or jsonb_array_length(p_assignments) = 0 then raise exception 'NOTHING_TO_APPROVE'; end if;

  for v_item in select * from jsonb_array_elements(p_assignments) loop
    select * into v_req from public.requests where id = (v_item ->> 'request_id')::uuid for update;
    if v_req.id is null or v_req.status <> 'waiting' then
      v_skipped := v_skipped || (v_item ->> 'request_id')::uuid;
      continue;
    end if;

    select * into v_driver from public.drivers where id = (v_item ->> 'driver_id')::uuid;
    select d.city_id into v_city from public.branches b join public.districts d on d.id = b.district_id where b.id = v_req.branch_id;
    if v_driver.id is null or not v_driver.active or private.driver_off(v_driver.id, p_visit_day) then
      raise exception 'DRIVER_UNAVAILABLE' using detail = v_item ->> 'driver_id';
    end if;
    if v_driver.material_id <> v_req.material_id then raise exception 'DRIVER_WRONG_MATERIAL' using detail = v_item ->> 'driver_id'; end if;
    if v_driver.city_id <> v_city then raise exception 'DRIVER_WRONG_CITY' using detail = v_item ->> 'driver_id'; end if;

    update public.requests set status = 'scheduled', visit_day = p_visit_day, driver_id = v_driver.id where id = v_req.id;
    perform private.log_event(v_req.id, 'waiting', 'scheduled', 'staff', auth.uid());
    perform private.notify(private.branch_user(v_req.id), 'visit_scheduled',
      'تم تحديد يوم الزيارة: ' || v_day_ar, 'Visit day set: ' || to_char(p_visit_day, 'Dy DD Mon'),
      private.request_label(v_req.id, 'ar'), private.request_label(v_req.id, 'en'), null, v_req.id, v_req.material_id);
    v_scheduled := v_scheduled + 1;
    if not v_driver.id = any (v_drivers) then v_drivers := v_drivers || v_driver.id; end if;
  end loop;

  foreach v_d in array v_drivers loop
    insert into public.plan_approvals (visit_day, driver_id, approved_by) values (p_visit_day, v_d, auth.uid());
    perform private.notify(private.driver_user(v_d), 'plan_updated',
      'تم تحديث خطتك ليوم ' || v_day_ar, 'Your plan for ' || to_char(p_visit_day, 'Dy DD Mon') || ' was updated',
      null, null, null, null, null);
  end loop;

  update public.requests set draft_cancelled = false where id = any (p_clear_draft_cancelled) and draft_cancelled;

  return json_build_object('scheduled', v_scheduled, 'drivers', coalesce(array_length(v_drivers, 1), 0), 'skipped', v_skipped);
end $$;

create or replace function public.staff_change_plan_driver(p_visit_day date, p_from_driver uuid, p_to_driver uuid)
returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_from public.drivers;
  v_to public.drivers;
  v_moved int := 0;
  v_id uuid;
begin
  perform private.require_staff();
  select * into v_from from public.drivers where id = p_from_driver;
  select * into v_to from public.drivers where id = p_to_driver;
  if v_to.id is null or not v_to.active or private.driver_off(v_to.id, p_visit_day) then raise exception 'DRIVER_UNAVAILABLE'; end if;
  if v_to.material_id <> v_from.material_id then raise exception 'DRIVER_WRONG_MATERIAL'; end if;
  if v_to.city_id <> v_from.city_id then raise exception 'DRIVER_WRONG_CITY'; end if;

  for v_id in
    update public.requests set driver_id = p_to_driver
    where visit_day = p_visit_day and driver_id = p_from_driver and status = 'scheduled'
    returning id
  loop
    perform private.log_event(v_id, 'scheduled', 'scheduled', 'staff', auth.uid(), 'تغيير السائق');
    v_moved := v_moved + 1;
  end loop;
  if v_moved = 0 then raise exception 'NOTHING_TO_MOVE'; end if;

  insert into public.plan_approvals (visit_day, driver_id, approved_by) values (p_visit_day, p_to_driver, auth.uid());
  perform private.notify(v_to.user_id, 'plan_updated', 'أُضيفت زيارات لخطتك', 'Visits were added to your plan', null, null, null, null, null);
  perform private.notify(v_from.user_id, 'plan_updated', 'نُقلت زيارات من خطتك لسائق آخر', 'Visits were moved from your plan to another driver', null, null, null, null, null);
  return v_moved;
end $$;

-- ---------------------------------------------------------------- close reason id (usage counts)

alter table public.requests add column closed_reason_id uuid references public.reasons (id);
create index requests_closed_reason_idx on public.requests (closed_reason_id);
update public.requests r set closed_reason_id = x.id
from public.reasons x where x.kind = 'close' and x.label_ar = r.closed_reason and r.status = 'closed' and r.closed_reason_id is null;

create or replace function public.staff_decide(p_request_id uuid, p_decision text, p_reason_id uuid default null, p_text text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_reason public.reasons;
  v_why text;
begin
  perform private.require_staff();
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null then raise exception 'NOT_FOUND'; end if;
  if v_req.status <> 'needs_decision' then raise exception 'INVALID_STATUS'; end if;

  if p_decision = 'reschedule' then
    update public.requests
    set status = 'waiting', visit_day = null, driver_id = null, decision_since = null
    where id = p_request_id;
    perform private.log_event(p_request_id, 'needs_decision', 'waiting', 'staff', auth.uid(), nullif(trim(p_text), ''));

  elsif p_decision = 'close' then
    if p_reason_id is not null then
      select * into v_reason from public.reasons where id = p_reason_id and kind = 'close' and active;
      if v_reason.id is null then raise exception 'INVALID_REASON'; end if;
      v_why := v_reason.label_ar;
    else
      v_why := nullif(trim(p_text), '');
      if v_why is null then raise exception 'REASON_REQUIRED'; end if;
    end if;
    update public.requests
    set status = 'closed', closed_reason = v_why, closed_reason_id = v_reason.id, closed_by = auth.uid(), decision_since = null
    where id = p_request_id;
    perform private.log_event(p_request_id, 'needs_decision', 'closed', 'staff', auth.uid(), v_why);
    perform private.notify(private.branch_user(p_request_id), 'request_closed',
      'أُغلق الطلب', 'Request closed', private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'),
      null, p_request_id, v_req.material_id);
  else
    raise exception 'INVALID_DECISION';
  end if;
end $$;

-- ---------------------------------------------------------------- read models for the admin screens

-- One row per branch: last request, open requests, its login (if any) and last sign-in.
create function public.staff_branch_overview()
returns table (branch_id uuid, last_request_at timestamptz, open_requests int, has_login boolean,
               last_sign_in_at timestamptz, must_change_password boolean, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return query
  select b.id,
         (select max(r.created_at) from public.requests r where r.branch_id = b.id),
         (select count(*)::int from public.requests r where r.branch_id = b.id and r.status in ('waiting', 'scheduled', 'needs_decision')),
         b.user_id is not null, u.last_sign_in_at, p.must_change_password, b.user_id
  from public.branches b
  left join public.profiles p on p.id = b.user_id
  left join auth.users u on u.id = b.user_id;
end $$;

-- Same for drivers, plus visits today / on the next working day.
create function public.staff_driver_overview()
returns table (driver_id uuid, has_login boolean, last_sign_in_at timestamptz, must_change_password boolean,
               visits_today int, visits_next int, off_today boolean, off_next boolean, user_id uuid)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := private.ops_today();
  v_next date := private.next_working_day(private.ops_today());
begin
  perform private.require_staff();
  return query
  select d.id, d.user_id is not null, u.last_sign_in_at, p.must_change_password,
         (select count(*)::int from public.requests r where r.driver_id = d.id and r.visit_day = v_today and r.status <> 'cancelled'),
         (select count(*)::int from public.requests r where r.driver_id = d.id and r.visit_day = v_next and r.status <> 'cancelled'),
         private.driver_off(d.id, v_today), private.driver_off(d.id, v_next), d.user_id
  from public.drivers d
  left join public.profiles p on p.id = d.user_id
  left join auth.users u on u.id = d.user_id;
end $$;

-- How many times each reason was used (failed / partial visits, cancelled and closed requests).
create function public.staff_reason_usage()
returns table (reason_id uuid, uses int)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return query
  select x.id,
    case x.kind
      when 'failed' then (select count(*)::int from public.visit_attempts a where a.reason_id = x.id)
      when 'partial' then (select count(*)::int from public.visit_attempts a where a.reason_id = x.id)
      when 'cancel' then (select count(*)::int from public.requests r where r.cancel_reason_id = x.id)
      else (select count(*)::int from public.requests r where r.closed_reason_id = x.id)
    end
  from public.reasons x;
end $$;

-- Reports screen. Requests are counted by creation day; visits, kg and trips by visit day. Riyadh days, inclusive.
-- Closed requests never count as collected. Failed visits count every attempt.
create function public.staff_report_v2(
  p_from date, p_to date, p_material uuid default null, p_city uuid default null,
  p_district uuid default null, p_driver uuid default null, p_chain uuid default null
) returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  v_result json;
  v_working_days int;
begin
  perform private.require_staff();
  if p_from is null or p_to is null or p_from > p_to then raise exception 'INVALID_RANGE'; end if;
  if p_to - p_from > 366 then raise exception 'RANGE_TOO_LONG'; end if;
  select count(*) into v_working_days from generate_series(p_from, p_to, interval '1 day') g(day) where private.is_working_day(g.day::date);

  with req as (
    select r.id, r.status, r.kg, r.material_id, r.branch_id, r.driver_id, b.chain_id, b.district_id, d.city_id
    from public.requests r
    join public.branches b on b.id = r.branch_id
    join public.districts d on d.id = b.district_id
    where (r.created_at at time zone 'Asia/Riyadh')::date between p_from and p_to
      and (p_material is null or r.material_id = p_material) and (p_city is null or d.city_id = p_city)
      and (p_district is null or b.district_id = p_district) and (p_chain is null or b.chain_id = p_chain)
      and (p_driver is null or r.driver_id = p_driver
           or exists (select 1 from public.visit_attempts a where a.request_id = r.id and a.driver_id = p_driver))
  ),
  att as (
    select a.request_id, a.driver_id, a.outcome, a.visit_day, r.kg, r.material_id, r.branch_id, b.chain_id, b.district_id, d.city_id
    from public.visit_attempts a
    join public.requests r on r.id = a.request_id
    join public.branches b on b.id = r.branch_id
    join public.districts d on d.id = b.district_id
    where a.visit_day between p_from and p_to
      and (p_material is null or r.material_id = p_material) and (p_city is null or d.city_id = p_city)
      and (p_district is null or b.district_id = p_district) and (p_chain is null or b.chain_id = p_chain)
      and (p_driver is null or a.driver_id = p_driver)
  ),
  drv as (
    select dr.id, dr.full_name, dr.full_name_en, dr.material_id, dr.city_id, dr.active
    from public.drivers dr
    where (p_material is null or dr.material_id = p_material) and (p_city is null or dr.city_id = p_city)
      and (p_driver is null or dr.id = p_driver)
  ),
  -- A trip = a working day on which the driver had an approved plan.
  trips as (
    select pa.driver_id, count(distinct pa.visit_day)::int as n
    from public.plan_approvals pa
    where pa.visit_day between p_from and p_to
    group by pa.driver_id
  ),
  offs as (
    select o.driver_id, count(*)::int as n
    from public.driver_days_off o
    where o.day between p_from and p_to and private.is_working_day(o.day)
    group by o.driver_id
  ),
  grp as (
    -- one row per request (for request counts) and per attempt (for visits/kg), tagged with every dimension
    select 'req' as src, r.status, null::public.visit_outcome as outcome, null::numeric as kg,
           r.material_id, r.city_id, r.district_id, r.chain_id, r.branch_id, r.driver_id from req r
    union all
    select 'att', null, a.outcome, case when a.outcome = 'full' then a.kg end,
           a.material_id, a.city_id, a.district_id, a.chain_id, a.branch_id, a.driver_id from att a
  )
  select json_build_object(
    'working_days', v_working_days,
    'totals', json_build_object(
      'requests', (select count(*) from req),
      'completed', (select count(*) from req where status = 'completed'),
      'closed', (select count(*) from req where status = 'closed'),
      'failed_visits', (select count(*) from att where outcome = 'failed'),
      'visits', (select count(*) from att where outcome in ('full', 'partial', 'failed')),
      'kg', (select coalesce(sum(kg), 0) from att where outcome = 'full'),
      'trips', (select coalesce(sum(t.n), 0) from trips t join drv on drv.id = t.driver_id)),
    'drivers', (select coalesce(json_agg(x order by x.active desc, x.kg desc, x.full_name), '[]') from (
        select drv.id, drv.full_name, drv.full_name_en, drv.material_id, drv.city_id, drv.active,
               coalesce(t.n, 0) as trips, coalesce(o.n, 0) as days_off,
               (select count(*) from att a where a.driver_id = drv.id and a.outcome in ('full', 'partial', 'failed')) as visits,
               (select count(*) from att a where a.driver_id = drv.id and a.outcome = 'failed') as failed,
               (select coalesce(sum(a.kg), 0) from att a where a.driver_id = drv.id and a.outcome = 'full') as kg
        from drv left join trips t on t.driver_id = drv.id left join offs o on o.driver_id = drv.id) x),
    'groups', json_build_object(
      'material', (select coalesce(json_agg(x), '[]') from (select material_id as key,
          count(*) filter (where src = 'req') as requests, count(*) filter (where src = 'req' and status = 'completed') as completed,
          count(*) filter (where src = 'req' and status = 'closed') as closed, count(*) filter (where outcome = 'failed') as failed,
          coalesce(sum(kg), 0) as kg from grp group by material_id) x),
      'city', (select coalesce(json_agg(x), '[]') from (select city_id as key,
          count(*) filter (where src = 'req') as requests, count(*) filter (where src = 'req' and status = 'completed') as completed,
          count(*) filter (where src = 'req' and status = 'closed') as closed, count(*) filter (where outcome = 'failed') as failed,
          coalesce(sum(kg), 0) as kg from grp group by city_id) x),
      'district', (select coalesce(json_agg(x), '[]') from (select district_id as key,
          count(*) filter (where src = 'req') as requests, count(*) filter (where src = 'req' and status = 'completed') as completed,
          count(*) filter (where src = 'req' and status = 'closed') as closed, count(*) filter (where outcome = 'failed') as failed,
          coalesce(sum(kg), 0) as kg from grp group by district_id) x),
      'chain', (select coalesce(json_agg(x), '[]') from (select chain_id as key,
          count(*) filter (where src = 'req') as requests, count(*) filter (where src = 'req' and status = 'completed') as completed,
          count(*) filter (where src = 'req' and status = 'closed') as closed, count(*) filter (where outcome = 'failed') as failed,
          coalesce(sum(kg), 0) as kg from grp group by chain_id) x),
      'branch', (select coalesce(json_agg(x), '[]') from (select branch_id as key,
          count(*) filter (where src = 'req') as requests, count(*) filter (where src = 'req' and status = 'completed') as completed,
          count(*) filter (where src = 'req' and status = 'closed') as closed, count(*) filter (where outcome = 'failed') as failed,
          coalesce(sum(kg), 0) as kg from grp group by branch_id) x),
      'driver', (select coalesce(json_agg(x), '[]') from (select driver_id as key,
          count(*) filter (where src = 'req') as requests, count(*) filter (where src = 'req' and status = 'completed') as completed,
          count(*) filter (where src = 'req' and status = 'closed') as closed, count(*) filter (where outcome = 'failed') as failed,
          coalesce(sum(kg), 0) as kg from grp where driver_id is not null group by driver_id) x))
  ) into v_result;
  return v_result;
end $$;

revoke execute on function
  public.staff_list_staff(), public.staff_update_staff(uuid, text, text, uuid[]),
  public.staff_set_material_manager(uuid, uuid, text), public.staff_set_driver_day(uuid, date, boolean),
  public.staff_branch_overview(), public.staff_driver_overview(), public.staff_reason_usage(),
  public.staff_report_v2(date, date, uuid, uuid, uuid, uuid, uuid)
from public, anon;
grant execute on function
  public.staff_list_staff(), public.staff_update_staff(uuid, text, text, uuid[]),
  public.staff_set_material_manager(uuid, uuid, text), public.staff_set_driver_day(uuid, date, boolean),
  public.staff_branch_overview(), public.staff_driver_overview(), public.staff_reason_usage(),
  public.staff_report_v2(date, date, uuid, uuid, uuid, uuid, uuid)
to authenticated;
revoke all on function private.driver_off(uuid, date) from public, anon;
grant execute on function private.driver_off(uuid, date) to authenticated;

-- ---------------------------------------------------------------- request list: branch name + access notes

create or replace view public.request_list with (security_invoker = true) as
select
  r.id, r.number, r.status, r.kg, r.note, r.contact_name, r.contact_phone, r.branch_photo_path,
  r.visit_day, r.driver_id, r.created_via, r.decision_since, r.draft_cancelled,
  r.cancel_reason_id, r.cancel_note, r.closed_reason, r.created_at, r.updated_at,
  r.branch_id, b.branch_number, b.phone as branch_phone, b.lat, b.lng,
  ch.id as chain_id, ch.code as chain_code, ch.name_ar as chain_name_ar, ch.name_en as chain_name_en,
  d.id as district_id, d.name_ar as district_name_ar, d.name_en as district_name_en,
  ci.id as city_id, ci.code as city_code, ci.name_ar as city_name_ar, ci.name_en as city_name_en,
  m.id as material_id, m.code as material_code, m.name_ar as material_name_ar, m.name_en as material_name_en,
  m.color_light as material_color_light, m.color_dark as material_color_dark,
  s.id as subtype_id, s.code as subtype_code, s.name_ar as subtype_name_ar, s.name_en as subtype_name_en,
  dr.full_name as driver_name, dr.full_name_en as driver_name_en, dr.phone as driver_phone,
  la.outcome as last_outcome, la.visit_day as last_attempt_day, la.recorded_at as last_attempt_at,
  coalesce(lr.label_ar, la.reason_text) as last_reason_ar, coalesce(lr.label_en, la.reason_text) as last_reason_en,
  la.note as last_attempt_note, la.photo_path as last_attempt_photo,
  r.created_by, r.cancelled_by, r.closed_by, la.driver_id as last_attempt_driver_id,
  b.name as branch_name, b.address as branch_address, b.access_notes as branch_access_notes
from public.requests r
join public.branches b on b.id = r.branch_id
join public.chains ch on ch.id = b.chain_id
join public.districts d on d.id = b.district_id
join public.cities ci on ci.id = d.city_id
join public.materials m on m.id = r.material_id
left join public.material_subtypes s on s.id = r.subtype_id
left join public.drivers dr on dr.id = r.driver_id
left join lateral (
  select va.* from public.visit_attempts va where va.request_id = r.id order by va.recorded_at desc limit 1
) la on true
left join public.reasons lr on lr.id = la.reason_id;
