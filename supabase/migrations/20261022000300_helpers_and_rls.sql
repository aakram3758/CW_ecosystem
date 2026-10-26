-- Clouds Water Ecosystem — 03: helper functions and row level security
-- Reads go straight to tables (scoped by RLS). Every write that changes a request goes through an RPC (04, 05).

-- ---------------------------------------------------------------- calendar (Asia/Riyadh, Fri + Sat off)

create function private.ops_today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Asia/Riyadh')::date
$$;

create function private.is_working_day(d date) returns boolean
language sql immutable set search_path = '' as $$
  select extract(isodow from d) not in (5, 6) -- ISO: 5 = Friday, 6 = Saturday
$$;

create function private.next_working_day(d date) returns date
language plpgsql immutable set search_path = '' as $$
declare n date := d + 1;
begin
  while not private.is_working_day(n) loop n := n + 1; end loop;
  return n;
end $$;

-- ---------------------------------------------------------------- who is calling

create function private.my_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select p.role from public.profiles p where p.id = auth.uid() and p.active
$$;

create function private.is_staff() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.role = 'staff' from public.profiles p where p.id = auth.uid() and p.active), false)
$$;

create function private.my_branch_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select b.id from public.branches b
  join public.profiles p on p.id = b.user_id
  where b.user_id = auth.uid() and p.active and b.active
$$;

create function private.my_driver_id() returns uuid
language sql stable security definer set search_path = '' as $$
  select d.id from public.drivers d
  join public.profiles p on p.id = d.user_id
  where d.user_id = auth.uid() and p.active and d.active
$$;

-- Branches a driver has been sent to (so the driver app can show name, phone and map pin).
create function private.my_driver_branch_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct r.branch_id from public.requests r where r.driver_id = private.my_driver_id()
$$;

create function private.require_staff() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not private.is_staff() then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
end $$;

-- ---------------------------------------------------------------- history + notifications

create function private.log_event(
  p_request uuid, p_from public.request_status, p_to public.request_status,
  p_actor_kind public.actor_kind, p_actor uuid, p_note text default null
) returns void
language sql security definer set search_path = '' as $$
  insert into public.request_events (request_id, from_status, to_status, actor_kind, actor_id, note)
  values (p_request, p_from, p_to, p_actor_kind, p_actor, p_note)
$$;

-- "بنده #106 – الصفا · كرتون" / "Panda #106 – Al Safa · Cardboard"
create function private.request_label(p_request uuid, p_lang text) returns text
language sql stable security definer set search_path = '' as $$
  select case when p_lang = 'ar'
    then c.name_ar || ' #' || b.branch_number || ' – ' || d.name_ar || ' · ' || m.name_ar || coalesce(' · ' || s.name_ar, '')
    else c.name_en || ' #' || b.branch_number || ' – ' || d.name_en || ' · ' || m.name_en || coalesce(' · ' || s.name_en, '')
  end
  from public.requests r
  join public.branches b on b.id = r.branch_id
  join public.chains c on c.id = b.chain_id
  join public.districts d on d.id = b.district_id
  join public.materials m on m.id = r.material_id
  left join public.material_subtypes s on s.id = r.subtype_id
  where r.id = p_request
$$;

create function private.notify(
  p_user uuid, p_kind text, p_title_ar text, p_title_en text,
  p_body_ar text, p_body_en text, p_link text, p_request uuid, p_material uuid
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, link, request_id, material_id)
  select p_user, p_kind, p_title_ar, p_title_en, p_body_ar, p_body_en, p_link, p_request, p_material
  where p_user is not null
$$;

-- Staff scope: general managers (no material) get everything, supervisors get their material only.
create function private.notify_staff(
  p_material uuid, p_kind text, p_title_ar text, p_title_en text,
  p_body_ar text, p_body_en text, p_link text, p_request uuid
) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, link, request_id, material_id)
  select p.id, p_kind, p_title_ar, p_title_en, p_body_ar, p_body_en, p_link, p_request, p_material
  from public.profiles p
  where p.role = 'staff' and p.active and (p.material_id is null or p.material_id = p_material)
$$;

create function private.branch_user(p_request uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select b.user_id from public.requests r join public.branches b on b.id = r.branch_id where r.id = p_request
$$;

create function private.driver_user(p_driver uuid) returns uuid
language sql stable security definer set search_path = '' as $$
  select d.user_id from public.drivers d where d.id = p_driver
$$;

-- ---------------------------------------------------------------- privileges

-- Nothing is reachable without signing in.
revoke all on all tables in schema public from anon;
revoke all on all sequences in schema public from anon;
alter default privileges in schema public revoke all on tables from anon;
alter default privileges in schema public revoke all on sequences from anon;
alter default privileges in schema public revoke execute on functions from anon, public;

-- Requests, their history, accounts and notifications are read-only to clients: every change goes through an RPC.
revoke insert, update, delete, truncate on
  public.requests, public.visit_attempts, public.request_events, public.plan_approvals, public.notifications, public.profiles
from authenticated;
revoke delete, truncate on
  public.cities, public.districts, public.chains, public.materials, public.material_subtypes, public.reasons,
  public.branches, public.drivers
from authenticated; -- reference rows are deactivated, never deleted (history points at them)

grant usage on schema private to authenticated;
revoke all on all functions in schema private from public, anon;
grant execute on function
  private.ops_today(), private.is_working_day(date), private.next_working_day(date),
  private.my_role(), private.is_staff(), private.my_branch_id(), private.my_driver_id(), private.my_driver_branch_ids()
to authenticated;

-- ---------------------------------------------------------------- row level security

alter table public.cities enable row level security;
alter table public.districts enable row level security;
alter table public.chains enable row level security;
alter table public.materials enable row level security;
alter table public.material_subtypes enable row level security;
alter table public.reasons enable row level security;
alter table public.profiles enable row level security;
alter table public.branches enable row level security;
alter table public.drivers enable row level security;
alter table public.requests enable row level security;
alter table public.visit_attempts enable row level security;
alter table public.request_events enable row level security;
alter table public.plan_approvals enable row level security;
alter table public.notifications enable row level security;

-- Reference lists: every signed-in account reads them; staff maintain them from the admin screens.
do $$
declare t text;
begin
  foreach t in array array['cities', 'districts', 'chains', 'materials', 'material_subtypes', 'reasons'] loop
    execute format('create policy %I on public.%I for select to authenticated using ((select private.my_role()) is not null)', t || '_read', t);
    execute format('create policy %I on public.%I for insert to authenticated with check ((select private.is_staff()))', t || '_staff_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using ((select private.is_staff())) with check ((select private.is_staff()))', t || '_staff_update', t);
  end loop;
end $$;

create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or (select private.is_staff()));

create policy branches_read on public.branches for select to authenticated
  using ((select private.is_staff()) or user_id = (select auth.uid()) or id in (select private.my_driver_branch_ids()));
create policy branches_staff_insert on public.branches for insert to authenticated
  with check ((select private.is_staff()));
create policy branches_staff_update on public.branches for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

create policy drivers_read on public.drivers for select to authenticated
  using ((select private.is_staff()) or user_id = (select auth.uid()));
create policy drivers_staff_insert on public.drivers for insert to authenticated
  with check ((select private.is_staff()));
create policy drivers_staff_update on public.drivers for update to authenticated
  using ((select private.is_staff())) with check ((select private.is_staff()));

-- Requests: staff see all; a branch sees its own; a driver sees what is assigned to him. Writes only via RPCs.
create policy requests_read on public.requests for select to authenticated
  using (
    (select private.is_staff())
    or branch_id = (select private.my_branch_id())
    or driver_id = (select private.my_driver_id())
  );

create policy visit_attempts_read on public.visit_attempts for select to authenticated
  using (
    (select private.is_staff())
    or driver_id = (select private.my_driver_id())
    or exists (select 1 from public.requests r where r.id = request_id and r.branch_id = (select private.my_branch_id()))
  );

create policy request_events_read on public.request_events for select to authenticated
  using (
    (select private.is_staff())
    or exists (select 1 from public.requests r where r.id = request_id and r.branch_id = (select private.my_branch_id()))
  );

create policy plan_approvals_read on public.plan_approvals for select to authenticated
  using ((select private.is_staff()));

create policy notifications_read on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
