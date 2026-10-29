-- 18 — 5,000 kg is the ceiling, on the server as well as in the form.
--
-- Both functions checked only `p_kg is null or p_kg <= 0`, so there was no upper bound anywhere and
-- five million kilograms was accepted. The branch form has refused anything over 5,000 since bite
-- 2.5 and says so («أكبر وزن مسموح 5,000 كجم. للكميات الأكبر تواصل مع المسؤول»), but a form is not
-- a rule — the RPC is reachable without it.
--
-- Both functions, not one. `branch_update_request` is how an existing request's weight changes, and
-- leaving it uncapped would let a 50 kg request become 50,000 after the fact.
--
-- The limit is written as a literal in both, the way every other check in these functions is. A
-- settings row would be a better home for it the day ops wants to change it per chain; nothing asks
-- for that today.

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
begin
  select * into v_branch from public.branches where id = private.my_branch_id();
  if v_branch.id is null then raise exception 'NOT_ALLOWED' using errcode = '42501'; end if;
  if v_branch.location_confirmed_at is null then raise exception 'LOCATION_REQUIRED'; end if;
  if p_kg is null or p_kg <= 0 then raise exception 'KG_REQUIRED'; end if;
  if p_kg > 5000 then raise exception 'KG_TOO_LARGE'; end if;
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
  update public.requests
  set kg = p_kg, note = nullif(trim(p_note), ''), contact_name = trim(p_contact_name), contact_phone = p_contact_phone,
      branch_photo_path = coalesce(p_photo_path, branch_photo_path)
  where id = p_request_id;
end $function$;
