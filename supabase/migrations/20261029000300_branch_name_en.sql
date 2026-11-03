-- 19 — a branch gets an English name, and English notifications stop printing Arabic.
--
-- `private.request_label(request, 'en')` built its English label from
-- `coalesce(b.name, d.name_en)`, and `branches.name` is the *Arabic* name — the only one the table
-- had. So an English notification about a named branch printed that Arabic name in the middle of an
-- English sentence. `request_label` is the only function in either schema that reads `b.name`, so
-- this is the whole of it.
--
-- The English fallback is the district, not the Arabic name. The label already carries
-- `'#' || b.branch_number`, so the branch is identified either way, and an English sentence that
-- stays English reads better than one with an Arabic fragment in it. The Arabic label is untouched
-- and still falls back to `d.name_ar`.
--
-- Nothing fills `name_en` yet: the column is nullable, every existing row is null, and until the
-- dashboard's branches screen grows a field for it the English label falls back to the district —
-- which is what it effectively did before, minus the Arabic. That field is dashboard work and is
-- not in this migration.

alter table public.branches add column if not exists name_en text;

comment on column public.branches.name_en is
  'Optional English branch name. The Arabic one is `name`; both are optional and fall back to the district.';

create or replace function private.request_label(p_request uuid, p_lang text)
returns text
language sql
stable
security definer
set search_path to ''
as $function$
  select case when p_lang = 'ar'
    then c.name_ar || ' #' || b.branch_number || ' – ' || coalesce(b.name, d.name_ar) || ' · ' || m.name_ar || coalesce(' · ' || s.name_ar, '')
    else c.name_en || ' #' || b.branch_number || ' – ' || coalesce(b.name_en, d.name_en) || ' · ' || m.name_en || coalesce(' · ' || s.name_en, '')
  end
  from public.requests r
  join public.branches b on b.id = r.branch_id
  join public.chains c on c.id = b.chain_id
  join public.districts d on d.id = b.district_id
  join public.materials m on m.id = r.material_id
  left join public.material_subtypes s on s.id = r.subtype_id
  where r.id = p_request
$function$;
