-- Clouds Water Ecosystem — 13: morning-of-visit notice to the branch
-- 08:00 Riyadh (05:00 UTC): every branch with a visit today gets one in-app notification. Expo push (later) reads
-- from public.notifications. Running it twice the same day sends nothing new.

create function private.notify_visit_day_morning() returns int
language sql security definer set search_path = '' as $$
  with sent as (
    insert into public.notifications (user_id, kind, title_ar, title_en, body_ar, body_en, request_id, material_id)
    select b.user_id, 'visit_today',
           'موعد الاستلام اليوم', 'Pickup is today',
           private.request_label(r.id, 'ar'), private.request_label(r.id, 'en'),
           r.id, r.material_id
    from public.requests r
    join public.branches b on b.id = r.branch_id
    where r.status = 'scheduled' and r.visit_day = private.ops_today() and b.user_id is not null
      and not exists (
        select 1 from public.notifications n
        where n.request_id = r.id and n.kind = 'visit_today'
          and n.created_at >= private.ops_today()::timestamp at time zone 'Asia/Riyadh'
      )
    returning 1
  )
  select count(*)::int from sent
$$;
revoke all on function private.notify_visit_day_morning() from public, anon, authenticated;

select cron.schedule('visit-day-morning-notice', '0 5 * * *', $$select private.notify_visit_day_morning()$$);
