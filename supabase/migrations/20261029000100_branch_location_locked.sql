-- 17 — a branch confirms its location once.
--
-- `branch_set_location` had no guard at all: it ran `update … location_confirmed_at = now()`
-- unconditionally, so a branch could move its pin after ops had verified it, any number of times.
-- The branch app's own screen says «مرة واحدة» and the account screen draws the saved location as
-- read-only, so the app already behaved as though this were true. Now it is.
--
-- Ops is unaffected: the dashboard does not call this function. It sets a location by updating
-- `public.branches` directly (`apps/dashboard/src/data/admin.ts`, `setBranchLocation`), under the
-- staff policies, which is exactly the "only the dashboard can change it after" the plan asks for.
--
-- The bounds check stays ahead of the new guard on purpose. Every seeded branch has
-- `location_confirmed_at` set, and `tests/lifecycle.sql` calls this function with lat 100 expecting
-- `INVALID_LOCATION`; checking the guard first would answer `LOCATION_ALREADY_SET` instead and the
-- test would fail for the wrong reason.

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
  if p_lat not between -90 and 90 or p_lng not between -180 and 180 then raise exception 'INVALID_LOCATION'; end if;
  if v_branch.location_confirmed_at is not null then raise exception 'LOCATION_ALREADY_SET'; end if;
  update public.branches set lat = p_lat, lng = p_lng, location_confirmed_at = now() where id = v_branch.id;
end $function$;
