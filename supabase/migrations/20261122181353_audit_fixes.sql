-- 24 — audit fixes (docs/audit-report.md and audit-report-v2.md, kept local): B1, B3, B4, B16, B17, B18, B20, B32,
-- B36, S2, S3, S9, and from v2 N3 and N4 (the two helpers migrations 21 and 23 added also kept PUBLIC EXECUTE).
--
-- B1  An account still on its temporary password can do nothing but change it: the role helpers return null while
--     `must_change_password` is true. Its own profile stays readable (`profiles_read` checks `auth.uid()`, not a
--     helper), and `complete_password_change` only uses `auth.uid()`, so both apps still reach and finish the
--     change-password screen. They route on `profiles.role`, never on these helpers.
-- B3  A branch's photo path must be in its own folder and exist in the bucket. B4: a driver's must be in the request's.
-- B16 Staff are held to the same 5,000 kg ceiling as branches (migration 18).
-- B17 Two creates racing past the duplicate check: the loser gets DUPLICATE_OPEN_REQUEST, not a raw 23505.
-- B18 A request can't be created on an inactive material or subtype (MATERIAL_INACTIVE).
-- S3  `branch_set_location(null, null)` passed the bounds check (null is not false) and locked an empty location.
-- B20 Functions created in `private` after migration 03's one-time revoke kept PUBLIC EXECUTE: that migration's
--     `alter default privileges in schema …` cannot take away the global PUBLIC default. Revoked here, and the
--     global default is changed so the next private function starts closed too.
-- B32, S2 A deactivated account (or one still on its temporary password) no longer reads its own notifications,
--     branch row or driver row. The apps read the profile to show "account disabled", which stays allowed.
-- B36 A reset signs the account out everywhere. The Auth admin API can only sign out a token it is handed, and
--     `reset-password` has the user id, not the user's token, so `set_temp_password` deletes the sessions itself.
--     Their refresh tokens go with them (cascade); an access token already issued lasts until it expires (≤ 1 h).
-- S9  Opening one notification in the branch app reads just that one (`mark_notification_read`); only "mark all" existed.

-- ---------------------------------------------------------------- B36: a reset ends every session

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
  delete from auth.sessions where user_id = p_user_id;      -- and signs the account out everywhere
end $$;

-- ---------------------------------------------------------------- B1: who is calling

create or replace function private.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active and not p.must_change_password
$$;

create or replace function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'staff' from public.profiles p
                   where p.id = auth.uid() and p.active and not p.must_change_password), false)
$$;

create or replace function private.my_branch_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.branches b
  join public.profiles p on p.id = b.user_id
  where b.user_id = auth.uid() and p.active and not p.must_change_password and b.active
$$;

create or replace function private.my_driver_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select d.id from public.drivers d
  join public.profiles p on p.id = d.user_id
  where d.user_id = auth.uid() and p.active and not p.must_change_password and d.active
$$;

-- ---------------------------------------------------------------- B32, S2: own rows need a usable account

alter policy notifications_read on public.notifications
  using (user_id = (select auth.uid()) and (select private.my_role()) is not null);
alter policy branches_read on public.branches
  using ((select private.is_staff())
         or (user_id = (select auth.uid()) and (select private.my_role()) is not null)
         or id in (select private.my_driver_branch_ids()));
alter policy drivers_read on public.drivers
  using ((select private.is_staff()) or (user_id = (select auth.uid()) and (select private.my_role()) is not null));

-- ---------------------------------------------------------------- B20: private functions are not public

revoke execute on function
  private.sweep_unrecorded_visits(), private.notify_stale_decisions(), private.photo_access(text, boolean),
  private.my_attempted_request_ids(), private.request_creator(uuid)
from public, anon;
alter default privileges revoke execute on functions from public;
-- photo_access, my_attempted_request_ids and request_creator keep their explicit grant to authenticated
-- (migrations 06, 21, 23); the storage policies, `requests_read` and `request_list` need them.

-- ---------------------------------------------------------------- audit v2 N3: a swept visit is not the driver's

-- The 20:00 sweep records a `no_result` attempt in the assigned driver's name. That is not a visit, so it must not
-- give the driver the lasting read migration 21 grants for "what they visited". `create or replace` keeps the grant.
create or replace function private.my_attempted_request_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct v.request_id from public.visit_attempts v
  where v.driver_id = private.my_driver_id() and v.outcome <> 'no_result'
$$;

-- ---------------------------------------------------------------- S3

create or replace function public.branch_set_location(p_lat double precision, p_lng double precision)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare v_branch public.branches;
begin
  select * into v_branch from public.branches where id = private.my_branch_id() for update;
  if v_branch.id is null then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if p_lat is null or p_lng is null then raise exception 'INVALID_LOCATION'; end if;
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_LOCATION'; end if;
  if v_branch.location_confirmed_at is not null then raise exception 'LOCATION_ALREADY_SET'; end if;
  update public.branches set lat = p_lat, lng = p_lng, location_confirmed_at = now() where id = v_branch.id;
end $function$;

-- ---------------------------------------------------------------- B3, B17, B18: branch create / edit

create or replace function public.branch_create_request(
  p_material_id uuid, p_subtype_id uuid, p_kg numeric, p_note text,
  p_contact_name text, p_contact_phone text, p_photo_path text default null::text)
returns json
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_branch public.branches;
  v_dup bigint;
  v_req public.requests;
  v_constraint text;
begin
  select * into v_branch from public.branches where id = private.my_branch_id();
  if v_branch.id is null then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_branch.location_confirmed_at is null then raise exception 'LOCATION_REQUIRED'; end if;
  if p_kg is null or p_kg <= 0 then raise exception 'KG_REQUIRED'; end if;
  if p_kg > 5000 then raise exception 'KG_TOO_LARGE'; end if;
  if coalesce(trim(p_contact_name), '') = '' then raise exception 'CONTACT_REQUIRED'; end if;
  if p_contact_phone !~ '^05[0-9]{8}$' then raise exception 'INVALID_PHONE'; end if;
  if not exists (select 1 from public.materials where id = p_material_id and active)
     or (p_subtype_id is not null and not exists (select 1 from public.material_subtypes where id = p_subtype_id and active)) then
    raise exception 'MATERIAL_INACTIVE';
  end if;
  if exists (select 1 from public.material_subtypes where material_id = p_material_id and active) and p_subtype_id is null then
    raise exception 'SUBTYPE_REQUIRED';
  end if;
  if p_photo_path is not null and (p_photo_path not like 'branch/' || v_branch.id || '/%'
     or not exists (select 1 from storage.objects where bucket_id = 'request-photos' and name = p_photo_path)) then
    raise exception 'INVALID_PHOTO';
  end if;

  select number into v_dup from public.requests
  where branch_id = v_branch.id and material_id = p_material_id and subtype_id is not distinct from p_subtype_id
    and status in ('waiting', 'scheduled', 'needs_decision');
  if v_dup is not null then raise exception 'DUPLICATE_OPEN_REQUEST' using detail = v_dup::text; end if;

  begin
    insert into public.requests (branch_id, material_id, subtype_id, kg, note, contact_name, contact_phone, branch_photo_path, created_by, created_via)
    values (v_branch.id, p_material_id, p_subtype_id, p_kg, nullif(trim(p_note), ''), trim(p_contact_name), p_contact_phone,
            p_photo_path, auth.uid(), 'branch_app')
    returning * into v_req;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint is distinct from 'requests_one_open_per_subtype' then raise; end if;
    select number into v_dup from public.requests
    where branch_id = v_branch.id and material_id = p_material_id and subtype_id is not distinct from p_subtype_id
      and status in ('waiting', 'scheduled', 'needs_decision');
    raise exception 'DUPLICATE_OPEN_REQUEST' using detail = coalesce(v_dup::text, '');
  end;
  perform private.log_event(v_req.id, null, 'waiting', 'branch', auth.uid());
  return json_build_object('id', v_req.id, 'number', v_req.number);
end $function$;

create or replace function public.branch_update_request(
  p_request_id uuid, p_kg numeric, p_note text,
  p_contact_name text, p_contact_phone text, p_photo_path text default null::text)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare v_req public.requests;
begin
  select * into v_req from public.requests where id = p_request_id for update;
  if v_req.id is null or v_req.branch_id is distinct from private.my_branch_id() then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_req.status <> 'waiting' then raise exception 'INVALID_STATUS'; end if;
  if p_kg is null or p_kg <= 0 then raise exception 'KG_REQUIRED'; end if;
  if p_kg > 5000 then raise exception 'KG_TOO_LARGE'; end if;
  if coalesce(trim(p_contact_name), '') = '' then raise exception 'CONTACT_REQUIRED'; end if;
  if p_contact_phone !~ '^05[0-9]{8}$' then raise exception 'INVALID_PHONE'; end if;
  if p_photo_path is not null and (p_photo_path not like 'branch/' || v_req.branch_id || '/%'
     or not exists (select 1 from storage.objects where bucket_id = 'request-photos' and name = p_photo_path)) then
    raise exception 'INVALID_PHOTO';
  end if;
  update public.requests
  set kg = p_kg, note = nullif(trim(p_note), ''), contact_name = trim(p_contact_name), contact_phone = p_contact_phone,
      branch_photo_path = coalesce(p_photo_path, branch_photo_path)
  where id = p_request_id;
end $function$;

-- ---------------------------------------------------------------- B16, B17, B18: staff create

create or replace function public.staff_create_request(
  p_branch_id uuid, p_material_id uuid, p_subtype_id uuid default null, p_kg numeric default null, p_note text default null
) returns json
language plpgsql security definer set search_path = '' as $$
declare
  v_branch public.branches;
  v_dup bigint;
  v_has_subtypes boolean;
  v_req public.requests;
  v_constraint text;
begin
  perform private.require_staff();
  select * into v_branch from public.branches where id = p_branch_id;
  if v_branch.id is null or not v_branch.active then raise exception 'BRANCH_INACTIVE'; end if;
  if p_kg > 5000 then raise exception 'KG_TOO_LARGE'; end if;
  if not exists (select 1 from public.materials where id = p_material_id and active)
     or (p_subtype_id is not null and not exists (select 1 from public.material_subtypes where id = p_subtype_id and active)) then
    raise exception 'MATERIAL_INACTIVE';
  end if;

  select exists (select 1 from public.material_subtypes where material_id = p_material_id and active) into v_has_subtypes;
  if v_has_subtypes and p_subtype_id is null then raise exception 'SUBTYPE_REQUIRED'; end if;

  select number into v_dup from public.requests
  where branch_id = p_branch_id and material_id = p_material_id
    and subtype_id is not distinct from p_subtype_id
    and status in ('waiting', 'scheduled', 'needs_decision');
  if v_dup is not null then raise exception 'DUPLICATE_OPEN_REQUEST' using detail = v_dup::text; end if;

  begin
    insert into public.requests (branch_id, material_id, subtype_id, kg, note, created_by, created_via)
    values (p_branch_id, p_material_id, p_subtype_id, p_kg, nullif(trim(p_note), ''), auth.uid(), 'dashboard')
    returning * into v_req;
  exception when unique_violation then
    get stacked diagnostics v_constraint = constraint_name;
    if v_constraint is distinct from 'requests_one_open_per_subtype' then raise; end if;
    select number into v_dup from public.requests
    where branch_id = p_branch_id and material_id = p_material_id
      and subtype_id is not distinct from p_subtype_id
      and status in ('waiting', 'scheduled', 'needs_decision');
    raise exception 'DUPLICATE_OPEN_REQUEST' using detail = coalesce(v_dup::text, '');
  end;

  perform private.log_event(v_req.id, null, 'waiting', 'staff', auth.uid());
  return json_build_object('id', v_req.id, 'number', v_req.number);
end $$;

-- ---------------------------------------------------------------- B4: driver outcome

create or replace function public.driver_record_outcome(
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
  if p_photo_path is not null and p_photo_path not like 'request/' || p_request_id || '/%' then raise exception 'INVALID_PHOTO'; end if;

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

-- ---------------------------------------------------------------- S9: opening one notification reads it

create or replace function public.mark_notification_read(p_id bigint) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now() where id = p_id and user_id = auth.uid() and read_at is null
$$;
revoke execute on function public.mark_notification_read(bigint) from public, anon;
grant execute on function public.mark_notification_read(bigint) to authenticated;
