-- Clouds Water Ecosystem — 05: branch app + driver app functions, scheduled jobs

-- ---------------------------------------------------------------- branch app

create function public.branch_set_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql security definer set search_path = '' as $$
declare v_branch uuid := private.my_branch_id();
begin
  if v_branch is null then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_LOCATION'; end if;
  update public.branches set lat = p_lat, lng = p_lng, location_confirmed_at = now() where id = v_branch;
end $$;

create function public.branch_create_request(
  p_material_id uuid, p_subtype_id uuid, p_kg numeric, p_note text,
  p_contact_name text, p_contact_phone text, p_photo_path text default null
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_branch public.branches;
  v_dup bigint;
  v_req public.requests;
begin
  select * into v_branch from public.branches where id = private.my_branch_id();
  if v_branch.id is null then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_branch.location_confirmed_at is null then raise exception 'LOCATION_REQUIRED'; end if;
  if p_kg is null or p_kg <= 0 then raise exception 'KG_REQUIRED'; end if;
  if coalesce(trim(p_contact_name), '') = '' then raise exception 'CONTACT_REQUIRED'; end if;
  if p_contact_phone !~ '^05[0-9]{8}$' then raise exception 'INVALID_PHONE'; end if;
  if exists (select 1 from public.material_subtypes where material_id = p_material_id and active) and p_subtype_id is null then
    raise exception 'SUBTYPE_REQUIRED';
  end if;

  select number into v_dup from public.requests
  where branch_id = v_branch.id and material_id = p_material_id and subtype_id is not distinct from p_subtype_id
    and status in ('waiting', 'scheduled', 'needs_decision');
  if v_dup is not null then raise exception 'DUPLICATE_OPEN_REQUEST' using detail = v_dup::text; end if;

  insert into public.requests (branch_id, material_id, subtype_id, kg, note, contact_name, contact_phone, branch_photo_path, created_by, created_via)
  values (v_branch.id, p_material_id, p_subtype_id, p_kg, nullif(trim(p_note), ''), trim(p_contact_name), p_contact_phone,
          p_photo_path, auth.uid(), 'branch_app')
  returning * into v_req;
  perform private.log_event(v_req.id, null, 'waiting', 'branch', auth.uid());
  return json_build_object('id', v_req.id, 'number', v_req.number);
end $$;

-- Editable until the request is scheduled.
create function public.branch_update_request(
  p_request_id uuid, p_kg numeric, p_note text, p_contact_name text, p_contact_phone text, p_photo_path text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare v_req public.requests;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null or v_req.branch_id is distinct from private.my_branch_id() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_req.status <> 'waiting' then raise exception 'INVALID_STATUS'; end if;
  if p_kg is null or p_kg <= 0 then raise exception 'KG_REQUIRED'; end if;
  if coalesce(trim(p_contact_name), '') = '' then raise exception 'CONTACT_REQUIRED'; end if;
  if p_contact_phone !~ '^05[0-9]{8}$' then raise exception 'INVALID_PHONE'; end if;
  update public.requests
  set kg = p_kg, note = nullif(trim(p_note), ''), contact_name = trim(p_contact_name), contact_phone = p_contact_phone,
      branch_photo_path = coalesce(p_photo_path, branch_photo_path)
  where id = p_request_id;
end $$;

-- Cancellable until the request is scheduled. Ops sees it struck-through in Scheduling until the next approval.
create function public.branch_cancel_request(p_request_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_req public.requests;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null or v_req.branch_id is distinct from private.my_branch_id() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_req.status <> 'waiting' then raise exception 'INVALID_STATUS'; end if;
  update public.requests set status = 'cancelled', draft_cancelled = true, cancelled_by = auth.uid() where id = p_request_id;
  perform private.log_event(p_request_id, 'waiting', 'cancelled', 'branch', auth.uid());
  perform private.notify_staff(v_req.material_id, 'branch_cancelled',
    'ألغى الفرع طلبه', 'A branch cancelled its request',
    private.request_label(p_request_id, 'ar') || ' · REQ-' || v_req.number, private.request_label(p_request_id, 'en') || ' · REQ-' || v_req.number,
    '/scheduling', p_request_id);
end $$;

-- ---------------------------------------------------------------- driver app

-- full = the stated quantity was collected (closes the request);
-- partial / failed = goes to "needs decision" for the general manager / material supervisor.
create function public.driver_record_outcome(
  p_request_id uuid, p_outcome public.visit_outcome, p_reason_id uuid default null,
  p_reason_text text default null, p_note text default null, p_photo_path text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_driver uuid := private.my_driver_id();
  v_req public.requests;
  v_reason public.reasons;
begin
  if v_driver is null then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null or v_req.driver_id is distinct from v_driver then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_req.status <> 'scheduled' then raise exception 'INVALID_STATUS'; end if;
  if v_req.visit_day <> private.ops_today() then raise exception 'NOT_VISIT_DAY'; end if;
  if p_outcome = 'no_result' then raise exception 'INVALID_OUTCOME'; end if;
  if p_outcome in ('full', 'partial') and p_photo_path is null then raise exception 'PHOTO_REQUIRED'; end if;

  if p_outcome in ('partial', 'failed') then
    if p_reason_id is not null then
      select * into v_reason from public.reasons where id = p_reason_id and kind::text = p_outcome::text and active;
      if v_reason.id is null then raise exception 'INVALID_REASON'; end if;
    elsif coalesce(trim(p_reason_text), '') = '' then
      raise exception 'REASON_REQUIRED';
    end if;
  end if;

  insert into public.visit_attempts (request_id, visit_day, driver_id, outcome, reason_id, reason_text, note, photo_path)
  values (p_request_id, v_req.visit_day, v_driver, p_outcome, p_reason_id, nullif(trim(p_reason_text), ''), nullif(trim(p_note), ''), p_photo_path);

  if p_outcome = 'full' then
    update public.requests set status = 'completed' where id = p_request_id;
    perform private.log_event(p_request_id, 'scheduled', 'completed', 'driver', auth.uid());
    perform private.notify(private.branch_user(p_request_id), 'request_completed', 'تم استلام طلبك', 'Your request was collected',
      private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'), null, p_request_id, v_req.material_id);
  else
    update public.requests set status = 'needs_decision', decision_since = now() where id = p_request_id;
    perform private.log_event(p_request_id, 'scheduled', 'needs_decision', 'driver', auth.uid(), coalesce(v_reason.label_ar, p_reason_text));
    perform private.notify_staff(v_req.material_id, case when p_outcome = 'partial' then 'partial_pickup' else 'visit_failed' end,
      case when p_outcome = 'partial' then 'استلام جزئي يحتاج قرار' else 'زيارة فاشلة: ' || coalesce(v_reason.label_ar, p_reason_text) end,
      case when p_outcome = 'partial' then 'Partial pickup needs a decision' else 'Failed visit: ' || coalesce(v_reason.label_en, p_reason_text) end,
      private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'), '/decisions', p_request_id);
    perform private.notify(private.branch_user(p_request_id), 'request_follow_up', 'قيد المتابعة مع المسؤول', 'Being followed up by the manager',
      private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'), null, p_request_id, v_req.material_id);
  end if;
end $$;

revoke execute on function
  public.branch_set_location(double precision, double precision),
  public.branch_create_request(uuid, uuid, numeric, text, text, text, text),
  public.branch_update_request(uuid, numeric, text, text, text, text),
  public.branch_cancel_request(uuid),
  public.driver_record_outcome(uuid, public.visit_outcome, uuid, text, text, text)
from public, anon;
grant execute on function
  public.branch_set_location(double precision, double precision),
  public.branch_create_request(uuid, uuid, numeric, text, text, text, text),
  public.branch_update_request(uuid, numeric, text, text, text, text),
  public.branch_cancel_request(uuid),
  public.driver_record_outcome(uuid, public.visit_outcome, uuid, text, text, text)
to authenticated;

-- ---------------------------------------------------------------- scheduled jobs (pg_cron, UTC)

-- 20:00 Riyadh: visits still without an outcome move to "needs decision" and staff are alerted.
create function private.sweep_unrecorded_visits() returns int
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_count int := 0;
begin
  for v_req in
    select * from public.requests where status = 'scheduled' and visit_day <= private.ops_today() for update
  loop
    insert into public.visit_attempts (request_id, visit_day, driver_id, outcome) values (v_req.id, v_req.visit_day, v_req.driver_id, 'no_result');
    update public.requests set status = 'needs_decision', decision_since = now() where id = v_req.id;
    perform private.log_event(v_req.id, 'scheduled', 'needs_decision', 'system', null, 'no_result');
    perform private.notify_staff(v_req.material_id, 'visit_no_result', 'زيارة بدون نتيجة', 'Visit without an outcome',
      private.request_label(v_req.id, 'ar'), private.request_label(v_req.id, 'en'), '/decisions', v_req.id);
    v_count := v_count + 1;
  end loop;
  return v_count;
end $$;

-- 09:00 Riyadh: one digest per staff member for decisions left untouched for over a day.
create function private.notify_stale_decisions() returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, link)
  select p.id, 'stale_decisions',
         s.n || ' بدون إجراء منذ أكثر من يوم', s.n || ' with no action for over a day',
         'في «يحتاج قرار»', 'In "Needs decision"', '/decisions'
  from public.profiles p
  cross join lateral (
    select count(*) as n from public.requests r
    where r.status = 'needs_decision' and r.decision_since < now() - interval '24 hours'
      and (p.material_id is null or r.material_id = p.material_id)
  ) s
  where p.role = 'staff' and p.active and s.n > 0
$$;

create extension if not exists pg_cron;
select cron.schedule('sweep-unrecorded-visits', '0 17 * * *', $$select private.sweep_unrecorded_visits()$$);
select cron.schedule('stale-decisions-digest', '0 6 * * *', $$select private.notify_stale_decisions()$$);
