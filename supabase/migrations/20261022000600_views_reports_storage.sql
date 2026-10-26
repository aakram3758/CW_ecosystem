-- Clouds Water Ecosystem — 06: read models for the screens, reports, photo storage

-- ---------------------------------------------------------------- request list (RLS of the caller applies)

create view public.request_list with (security_invoker = true) as
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
  la.note as last_attempt_note, la.photo_path as last_attempt_photo
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

grant select on public.request_list to authenticated;

-- ---------------------------------------------------------------- overview

create function public.staff_overview(p_city uuid default null, p_material uuid default null)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := private.ops_today();
  v_result json;
begin
  perform private.require_staff();
  with scoped as (
    select r.*, d.city_id,
      (select va.outcome from public.visit_attempts va where va.request_id = r.id order by va.recorded_at desc limit 1) as last_outcome,
      (select va.visit_day from public.visit_attempts va where va.request_id = r.id order by va.recorded_at desc limit 1) as last_day
    from public.requests r
    join public.branches b on b.id = r.branch_id
    join public.districts d on d.id = b.district_id
    where (p_city is null or d.city_id = p_city) and (p_material is null or r.material_id = p_material)
  )
  select json_build_object(
    'today', v_today,
    'next_working_day', private.next_working_day(v_today),
    'waiting', count(*) filter (where status = 'waiting'),
    'stale_waiting', count(*) filter (where status = 'waiting' and created_at < now() - interval '2 days'),
    'scheduled_today', count(*) filter (where visit_day = v_today and status <> 'cancelled'),
    'drivers_today', count(distinct driver_id) filter (where visit_day = v_today and status <> 'cancelled'),
    'needs_decision', count(*) filter (where status = 'needs_decision'),
    'partial', count(*) filter (where status = 'needs_decision' and last_outcome = 'partial'),
    'failed', count(*) filter (where status = 'needs_decision' and last_outcome = 'failed'),
    'no_result', count(*) filter (where status = 'needs_decision' and coalesce(last_outcome, 'no_result') = 'no_result'),
    'stale_decisions', count(*) filter (where status = 'needs_decision' and decision_since < now() - interval '24 hours'),
    'completed_week', count(*) filter (where status = 'completed' and last_day >= v_today - 6),
    'kg_week', coalesce(sum(kg) filter (where status = 'completed' and last_day >= v_today - 6), 0)
  ) into v_result
  from scoped;
  return v_result;
end $$;

-- Active branches with no request (any material) for more than a week, or never. Material filter never applies.
create function public.staff_late_branches(p_city uuid default null)
returns table (
  branch_id uuid, chain_code text, chain_name_ar text, chain_name_en text, branch_number text,
  district_name_ar text, district_name_en text, city_id uuid, city_code text, phone text,
  last_request_at timestamptz, days_since int
)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return query
  select b.id, ch.code, ch.name_ar, ch.name_en, b.branch_number, d.name_ar, d.name_en, ci.id, ci.code, b.phone,
         lr.last_at, (private.ops_today() - (lr.last_at at time zone 'Asia/Riyadh')::date)::int
  from public.branches b
  join public.chains ch on ch.id = b.chain_id
  join public.districts d on d.id = b.district_id
  join public.cities ci on ci.id = d.city_id
  left join lateral (select max(r.created_at) as last_at from public.requests r where r.branch_id = b.id) lr on true
  where b.active and (p_city is null or ci.id = p_city)
    and (lr.last_at is null or lr.last_at < now() - interval '7 days')
  order by lr.last_at asc nulls first;
end $$;

-- ---------------------------------------------------------------- reports

-- Everything the Reports screen shows for a date range (Riyadh days, inclusive).
create function public.staff_report(p_from date, p_to date, p_city uuid default null, p_material uuid default null)
returns json
language plpgsql stable security definer set search_path = '' as $$
declare v_result json;
begin
  perform private.require_staff();
  if p_from is null or p_to is null or p_from > p_to then raise exception 'INVALID_RANGE'; end if;
  if p_to - p_from > 366 then raise exception 'RANGE_TOO_LONG'; end if;

  with req as (
    select r.*, d.city_id, b.chain_id
    from public.requests r
    join public.branches b on b.id = r.branch_id
    join public.districts d on d.id = b.district_id
    where (r.created_at at time zone 'Asia/Riyadh')::date between p_from and p_to
      and (p_city is null or d.city_id = p_city) and (p_material is null or r.material_id = p_material)
  ),
  att as (
    select va.*, r.material_id, r.kg, d.city_id
    from public.visit_attempts va
    join public.requests r on r.id = va.request_id
    join public.branches b on b.id = r.branch_id
    join public.districts d on d.id = b.district_id
    where va.visit_day between p_from and p_to
      and (p_city is null or d.city_id = p_city) and (p_material is null or r.material_id = p_material)
  )
  select json_build_object(
    'totals', (select json_build_object(
        'created', (select count(*) from req),
        'from_branch_app', (select count(*) from req where created_via = 'branch_app'),
        'visits', (select count(*) from att),
        'full', (select count(*) from att where outcome = 'full'),
        'partial', (select count(*) from att where outcome = 'partial'),
        'failed', (select count(*) from att where outcome = 'failed'),
        'no_result', (select count(*) from att where outcome = 'no_result'),
        'kg_collected', (select coalesce(sum(kg), 0) from att where outcome = 'full'),
        'cancelled', (select count(*) from req where status = 'cancelled'),
        'closed', (select count(*) from req where status = 'closed'))),
    'by_day', (select coalesce(json_agg(x order by x.day), '[]') from (
        select g.day::date as day,
               (select count(*) from req where (created_at at time zone 'Asia/Riyadh')::date = g.day) as created,
               (select count(*) from att where visit_day = g.day and outcome = 'full') as completed,
               (select coalesce(sum(kg), 0) from att where visit_day = g.day and outcome = 'full') as kg
        from generate_series(p_from, p_to, interval '1 day') g(day)) x),
    'by_material', (select coalesce(json_agg(x order by x.sort_order), '[]') from (
        select m.id, m.code, m.name_ar, m.name_en, m.color_light, m.color_dark, m.sort_order,
               (select count(*) from req where material_id = m.id) as created,
               (select count(*) from att where material_id = m.id and outcome = 'full') as completed,
               (select coalesce(sum(kg), 0) from att where material_id = m.id and outcome = 'full') as kg
        from public.materials m where p_material is null or m.id = p_material) x),
    'by_city', (select coalesce(json_agg(x order by x.sort_order), '[]') from (
        select c.id, c.code, c.name_ar, c.name_en, c.sort_order,
               (select count(*) from req where city_id = c.id) as created,
               (select count(*) from att where city_id = c.id and outcome = 'full') as completed,
               (select coalesce(sum(kg), 0) from att where city_id = c.id and outcome = 'full') as kg
        from public.cities c where p_city is null or c.id = p_city) x),
    'by_driver', (select coalesce(json_agg(x order by x.visits desc), '[]') from (
        select dr.id, dr.full_name, dr.full_name_en,
               count(*) as visits,
               count(*) filter (where a.outcome = 'full') as "full",
               count(*) filter (where a.outcome = 'partial') as partial,
               count(*) filter (where a.outcome = 'failed') as failed,
               count(*) filter (where a.outcome = 'no_result') as no_result,
               coalesce(sum(a.kg) filter (where a.outcome = 'full'), 0) as kg
        from att a join public.drivers dr on dr.id = a.driver_id
        group by dr.id) x),
    'by_chain', (select coalesce(json_agg(x order by x.created desc), '[]') from (
        select ch.id, ch.code, ch.name_ar, ch.name_en, count(r.id) as created,
               count(r.id) filter (where r.status = 'completed') as completed
        from public.chains ch left join req r on r.chain_id = ch.id
        group by ch.id) x),
    'failure_reasons', (select coalesce(json_agg(x order by x.n desc), '[]') from (
        select coalesce(rs.label_ar, a.reason_text, '—') as label_ar, coalesce(rs.label_en, a.reason_text, '—') as label_en,
               a.outcome, count(*) as n
        from att a left join public.reasons rs on rs.id = a.reason_id
        where a.outcome in ('partial', 'failed')
        group by 1, 2, 3) x)
  ) into v_result;
  return v_result;
end $$;

revoke execute on function
  public.staff_overview(uuid, uuid), public.staff_late_branches(uuid), public.staff_report(date, date, uuid, uuid)
from public, anon;
grant execute on function
  public.staff_overview(uuid, uuid), public.staff_late_branches(uuid), public.staff_report(date, date, uuid, uuid)
to authenticated;

-- ---------------------------------------------------------------- photos

-- Private bucket. Paths:
--   branch/<branch_id>/<uuid>.jpg    photo the branch attaches to a new request (uploaded before the request exists)
--   request/<request_id>/<uuid>.jpg  photo the driver takes at the visit
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('request-photos', 'request-photos', false, 5242880, array['image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

create function private.photo_access(p_name text, p_write boolean) returns boolean
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
    -- the assigned driver can see the branch's photo
    return not p_write and exists (
      select 1 from public.requests r
      where r.branch_id = v_id and r.driver_id = private.my_driver_id() and r.branch_photo_path = p_name);
  elsif v_parts[1] = 'request' then
    return exists (
      select 1 from public.requests r
      where r.id = v_id and (
        (r.driver_id = private.my_driver_id() and (not p_write or r.status = 'scheduled'))
        or (not p_write and r.branch_id = private.my_branch_id())));
  end if;
  return false;
end $$;
grant execute on function private.photo_access(text, boolean) to authenticated;

create policy request_photos_read on storage.objects for select to authenticated
  using (bucket_id = 'request-photos' and private.photo_access(name, false));
create policy request_photos_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'request-photos' and private.photo_access(name, true));
