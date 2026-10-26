-- Clouds Water Ecosystem — 08: account administration from the dashboard
-- Logins themselves are created by the "create-account" / "reset-password" Edge Functions (they need the service role).

create function public.staff_set_account_active(p_user_id uuid, p_active boolean) returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  if p_user_id = auth.uid() and not p_active then raise exception 'CANNOT_DEACTIVATE_SELF'; end if;
  update public.profiles set active = p_active where id = p_user_id;
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Name and default material of a dashboard user (material set = supervisor; null = general manager).
create function public.staff_update_staff(p_user_id uuid, p_display_name text, p_display_name_en text, p_material_id uuid)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  perform private.require_staff();
  if coalesce(trim(p_display_name), '') = '' then raise exception 'NAME_REQUIRED'; end if;
  update public.profiles
  set display_name = trim(p_display_name), display_name_en = nullif(trim(p_display_name_en), ''), material_id = p_material_id
  where id = p_user_id and role = 'staff';
  if not found then raise exception 'NOT_FOUND'; end if;
end $$;

-- Staff list for the "Materials & managers" screen, with each login's email.
create function public.staff_list_staff()
returns table (id uuid, email text, display_name text, display_name_en text, material_id uuid, active boolean,
               must_change_password boolean, created_at timestamptz, last_sign_in_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  perform private.require_staff();
  return query
  select p.id, u.email::text, p.display_name, p.display_name_en, p.material_id, p.active, p.must_change_password, p.created_at, u.last_sign_in_at
  from public.profiles p join auth.users u on u.id = p.id
  where p.role = 'staff'
  order by p.material_id nulls first, p.display_name;
end $$;

revoke execute on function
  public.staff_set_account_active(uuid, boolean), public.staff_update_staff(uuid, text, text, uuid), public.staff_list_staff()
from public, anon;
grant execute on function
  public.staff_set_account_active(uuid, boolean), public.staff_update_staff(uuid, text, text, uuid), public.staff_list_staff()
to authenticated;
