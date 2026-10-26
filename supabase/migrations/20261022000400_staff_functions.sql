-- Clouds Water Ecosystem — 04: dashboard (staff) functions
-- All business rules live here so the dashboard and the mobile app can never disagree.
-- Errors are raised as UPPER_SNAKE codes in the message; the apps translate them.

-- ---------------------------------------------------------------- create a request for a branch

create function public.staff_create_request(
  p_branch_id uuid, p_material_id uuid, p_subtype_id uuid default null, p_kg numeric default null, p_note text default null
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_branch public.branches;
  v_dup bigint;
  v_has_subtypes boolean;
  v_req public.requests;
begin
  perform private.require_staff();
  select * into v_branch from public.branches where id = p_branch_id;
  if v_branch.id is null or not v_branch.active then raise exception 'BRANCH_INACTIVE'; end if;

  select exists (select 1 from public.material_subtypes where material_id = p_material_id and active) into v_has_subtypes;
  if v_has_subtypes and p_subtype_id is null then raise exception 'SUBTYPE_REQUIRED'; end if;

  select number into v_dup from public.requests
  where branch_id = p_branch_id and material_id = p_material_id
    and subtype_id is not distinct from p_subtype_id
    and status in ('waiting', 'scheduled', 'needs_decision');
  if v_dup is not null then raise exception 'DUPLICATE_OPEN_REQUEST' using detail = v_dup::text; end if;

  insert into public.requests (branch_id, material_id, subtype_id, kg, note, created_by, created_via)
  values (p_branch_id, p_material_id, p_subtype_id, p_kg, nullif(trim(p_note), ''), auth.uid(), 'dashboard')
  returning * into v_req;

  perform private.log_event(v_req.id, null, 'waiting', 'staff', auth.uid());
  return json_build_object('id', v_req.id, 'number', v_req.number);
end $$;

-- ---------------------------------------------------------------- cancel (waiting or scheduled)

create function public.staff_cancel_request(p_request_id uuid, p_reason_id uuid default null, p_note text default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_reason public.reasons;
begin
  perform private.require_staff();
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null then raise exception 'NOT_FOUND'; end if;
  if v_req.status not in ('waiting', 'scheduled') then raise exception 'INVALID_STATUS'; end if;

  if p_reason_id is not null then
    select * into v_reason from public.reasons where id = p_reason_id and kind = 'cancel' and active;
    if v_reason.id is null then raise exception 'INVALID_REASON'; end if;
  elsif coalesce(trim(p_note), '') = '' then
    raise exception 'REASON_REQUIRED'; -- "Other" needs a typed note
  end if;

  update public.requests
  set status = 'cancelled', cancel_reason_id = p_reason_id, cancel_note = nullif(trim(p_note), ''), cancelled_by = auth.uid()
  where id = p_request_id;
  perform private.log_event(p_request_id, v_req.status, 'cancelled', 'staff', auth.uid(),
    coalesce(v_reason.label_ar, '') || coalesce(' — ' || nullif(trim(p_note), ''), ''));

  perform private.notify(private.branch_user(p_request_id), 'request_cancelled',
    'أُلغي طلبك', 'Your request was cancelled',
    private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'), null, p_request_id, v_req.material_id);
  if v_req.status = 'scheduled' then
    perform private.notify(private.driver_user(v_req.driver_id), 'plan_changed',
      'حُذف طلب من خطتك', 'A request was removed from your plan',
      private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'), null, p_request_id, v_req.material_id);
  end if;
end $$;

-- ---------------------------------------------------------------- approve (or extend) the next working day's plan
-- p_assignments: [{"request_id": "…", "driver_id": "…"}, …]
-- Requests no longer waiting (e.g. the branch cancelled meanwhile) are skipped and reported back.

create function public.staff_approve_plan(p_visit_day date, p_assignments jsonb, p_clear_draft_cancelled uuid[] default '{}')
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
    if v_driver.id is null or not v_driver.active or not v_driver.working then raise exception 'DRIVER_UNAVAILABLE' using detail = v_item ->> 'driver_id'; end if;
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

-- ---------------------------------------------------------------- change the driver of a day's plan (not-yet-visited stops only)

create function public.staff_change_plan_driver(p_visit_day date, p_from_driver uuid, p_to_driver uuid)
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
  if v_to.id is null or not v_to.active then raise exception 'DRIVER_UNAVAILABLE'; end if;
  if p_visit_day = private.next_working_day(private.ops_today()) and not v_to.working then raise exception 'DRIVER_UNAVAILABLE'; end if;
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

-- ---------------------------------------------------------------- decide on a "needs decision" request

create function public.staff_decide(p_request_id uuid, p_decision text, p_reason_id uuid default null, p_text text default null)
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
    set status = 'closed', closed_reason = v_why, closed_by = auth.uid(), decision_since = null
    where id = p_request_id;
    perform private.log_event(p_request_id, 'needs_decision', 'closed', 'staff', auth.uid(), v_why);
    perform private.notify(private.branch_user(p_request_id), 'request_closed',
      'أُغلق الطلب', 'Request closed', private.request_label(p_request_id, 'ar'), private.request_label(p_request_id, 'en'),
      null, p_request_id, v_req.material_id);
  else
    raise exception 'INVALID_DECISION';
  end if;
end $$;

-- Undo a reschedule made by the same user in the last 15 minutes, if nothing else happened since.
create function public.staff_undo_reschedule(p_request_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_req public.requests;
  v_last public.request_events;
  v_attempt public.visit_attempts;
  v_since timestamptz;
begin
  perform private.require_staff();
  select * into v_req from public.requests where id = p_request_id for update;
  select * into v_last from public.request_events where request_id = p_request_id order by id desc limit 1;
  if v_req.status <> 'waiting' or v_last.from_status is distinct from 'needs_decision' or v_last.to_status <> 'waiting'
     or v_last.actor_id is distinct from auth.uid() or v_last.created_at < now() - interval '15 minutes' then
    raise exception 'UNDO_NOT_POSSIBLE';
  end if;
  select * into v_attempt from public.visit_attempts where request_id = p_request_id order by recorded_at desc limit 1;
  select created_at into v_since from public.request_events
  where request_id = p_request_id and to_status = 'needs_decision' order by id desc limit 1;

  update public.requests
  set status = 'needs_decision', visit_day = v_attempt.visit_day, driver_id = v_attempt.driver_id, decision_since = coalesce(v_since, now())
  where id = p_request_id;
  perform private.log_event(p_request_id, 'waiting', 'needs_decision', 'staff', auth.uid(), 'تراجع');
end $$;

-- ---------------------------------------------------------------- any signed-in account

create function public.mark_notifications_read() returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where user_id = auth.uid() and read_at is null
$$;

-- Called by the apps right after supabase.auth.updateUser({ password }) on first login.
create function public.complete_password_change() returns void
language sql security definer set search_path = '' as $$
  update public.profiles set must_change_password = false where id = auth.uid()
$$;

revoke execute on function
  public.staff_create_request(uuid, uuid, uuid, numeric, text),
  public.staff_cancel_request(uuid, uuid, text),
  public.staff_approve_plan(date, jsonb, uuid[]),
  public.staff_change_plan_driver(date, uuid, uuid),
  public.staff_decide(uuid, text, uuid, text),
  public.staff_undo_reschedule(uuid),
  public.mark_notifications_read(),
  public.complete_password_change()
from public, anon;
grant execute on function
  public.staff_create_request(uuid, uuid, uuid, numeric, text),
  public.staff_cancel_request(uuid, uuid, text),
  public.staff_approve_plan(date, jsonb, uuid[]),
  public.staff_change_plan_driver(date, uuid, uuid),
  public.staff_decide(uuid, text, uuid, text),
  public.staff_undo_reschedule(uuid),
  public.mark_notifications_read(),
  public.complete_password_change()
to authenticated;
