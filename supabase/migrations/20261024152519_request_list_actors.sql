-- Clouds Water Ecosystem — 10: who created / cancelled / closed each request, for the dashboard drawer

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
  r.created_by, r.cancelled_by, r.closed_by, la.driver_id as last_attempt_driver_id
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
