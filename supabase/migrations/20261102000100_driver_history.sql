-- 21 — a driver keeps what they visited.
--
-- A driver reads a request, its branch and its photos only while `requests.driver_id` still points
-- at them. `visit_attempts_read` keeps their own attempts readable for good, so the moment ops
-- reschedules a visit they already recorded — `staff_decide` with 'reschedule' sets `driver_id` to
-- null — their history keeps the row and loses everything it points at: no branch, no material, no
-- request number, and their own scale photo refused. That is the ordinary path after a failed visit,
-- not an edge case (apps/mobile/PLAN.md, *Driver history*, checked against the live database).
--
-- So a driver may also read whatever sits behind an attempt of their own. The list of those requests
-- comes from a `security definer` helper, the way `my_driver_branch_ids` already does it: a policy on
-- `requests` that selected from `visit_attempts` directly would recurse, because
-- `visit_attempts_read` selects from `requests` for the branch.
--
-- The app filters every plan read on `driver_id = me` regardless, so a request now assigned to
-- another driver never shows on this driver's plan — it only stays readable from their history.
--
-- Also here, both for the driver's "next plan" screen:
--   · a driver reads their own `plan_approvals` rows, which is the only place the approval time lives;
--   · `driver_days_off` and `plan_approvals` join `supabase_realtime`, so a day off or an approval
--     set from the dashboard reaches an open app. Realtime checks each change against the
--     subscriber's own RLS, as migration 20 explains.

create function private.my_attempted_request_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct v.request_id from public.visit_attempts v where v.driver_id = private.my_driver_id()
$$;
grant execute on function private.my_attempted_request_ids() to authenticated;

create or replace function private.my_driver_branch_ids() returns setof uuid
language sql stable security definer set search_path = '' as $$
  select distinct r.branch_id from public.requests r
  where r.driver_id = private.my_driver_id() or r.id in (select private.my_attempted_request_ids())
$$;

drop policy requests_read on public.requests;
create policy requests_read on public.requests for select to authenticated using (
  (select private.is_staff())
  or branch_id = (select private.my_branch_id())
  or driver_id = (select private.my_driver_id())
  or id in (select private.my_attempted_request_ids())
);

drop policy plan_approvals_read on public.plan_approvals;
create policy plan_approvals_read on public.plan_approvals for select to authenticated using (
  (select private.is_staff()) or driver_id = (select private.my_driver_id())
);

-- Only the two read branches change: a driver may see the branch's photo and their own photo of a
-- request they visited. Writing is untouched — a driver still uploads only while the request is
-- assigned to them and `scheduled`.
create or replace function private.photo_access(p_name text, p_write boolean) returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare
  v_parts text[] := string_to_array(p_name, '/');
  v_id uuid;
begin
  if array_length(v_parts, 1) <> 3 then return false; end if;
  begin
    v_id := v_parts[2]::uuid;
  exception when invalid_text_representation then
    return false;
  end;
  if private.is_staff() then return not p_write; end if; -- staff view photos, they never upload them

  if v_parts[1] = 'branch' then
    if v_id = private.my_branch_id() then return true; end if;
    -- the assigned driver, or one who visited the request, can see the branch's photo
    return not p_write and exists (
      select 1 from public.requests r
      where r.branch_id = v_id and r.branch_photo_path = p_name
        and (r.driver_id = private.my_driver_id() or r.id in (select private.my_attempted_request_ids())));
  elsif v_parts[1] = 'request' then
    return exists (
      select 1 from public.requests r
      where r.id = v_id and (
        (r.driver_id = private.my_driver_id() and (not p_write or r.status = 'scheduled'))
        or (not p_write and r.id in (select private.my_attempted_request_ids()))
        or (not p_write and r.branch_id = private.my_branch_id())));
  end if;
  return false;
end $$;

alter publication supabase_realtime add table public.driver_days_off, public.plan_approvals;
