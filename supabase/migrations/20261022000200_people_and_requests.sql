-- Clouds Water Ecosystem — 02: accounts, branches, drivers, requests and their history

-- One profile per auth user. Dashboard users are "staff" (all have general-manager permissions);
-- a staff member with material_id set is a material supervisor (default filter + notification scope only).
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.app_role not null,
  display_name text not null,
  display_name_en text,
  material_id uuid references public.materials (id),
  active boolean not null default true,
  must_change_password boolean not null default true,
  created_at timestamptz not null default now(),
  check (role = 'staff' or material_id is null)
);

create table public.branches (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references public.chains (id),
  branch_number text not null check (branch_number ~ '^[0-9]{1,6}$'),
  district_id uuid not null references public.districts (id),
  user_id uuid unique references public.profiles (id) on delete set null, -- one account per branch
  phone text, -- branch mobile on file (contact per request is typed separately)
  lat double precision,
  lng double precision,
  location_confirmed_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (chain_id, branch_number),
  check ((lat is null) = (lng is null))
);
create index branches_district_idx on public.branches (district_id);

create table public.drivers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references public.profiles (id) on delete set null,
  full_name text not null,
  full_name_en text,
  phone text not null unique,
  city_id uuid not null references public.cities (id),
  material_id uuid not null references public.materials (id), -- each driver belongs to exactly one material
  active boolean not null default true,
  -- Ops marks drivers working / not working for the day being planned.
  working boolean not null default true,
  unavailable_note text,
  created_at timestamptz not null default now()
);
create index drivers_city_material_idx on public.drivers (city_id, material_id);

create table public.requests (
  id uuid primary key default gen_random_uuid(),
  number bigint generated always as identity (start with 10001) unique, -- shown as REQ-10001
  branch_id uuid not null references public.branches (id),
  material_id uuid not null references public.materials (id),
  subtype_id uuid,
  kg numeric(10, 2) check (kg is null or kg > 0), -- branch's weight = the recorded figure
  note text,
  contact_name text,
  contact_phone text,
  branch_photo_path text,
  status public.request_status not null default 'waiting',
  visit_day date,
  driver_id uuid references public.drivers (id),
  created_by uuid references public.profiles (id),
  created_via text not null default 'branch_app' check (created_via in ('branch_app', 'dashboard')),
  decision_since timestamptz,
  draft_cancelled boolean not null default false,
  cancel_reason_id uuid references public.reasons (id),
  cancel_note text,
  cancelled_by uuid references public.profiles (id),
  closed_reason text,
  closed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (subtype_id, material_id) references public.material_subtypes (id, material_id),
  -- A scheduled request always has a day and a driver.
  check (status <> 'scheduled' or (visit_day is not null and driver_id is not null)),
  -- Branch app requests carry a contact person.
  check (created_via <> 'branch_app' or (contact_name is not null and contact_phone is not null))
);

-- One open request per branch per material subtype (an open "stretch" doesn't block a "mix").
create unique index requests_one_open_per_subtype
  on public.requests (branch_id, material_id, coalesce(subtype_id, '00000000-0000-0000-0000-000000000000'::uuid))
  where status in ('waiting', 'scheduled', 'needs_decision');
create index requests_status_idx on public.requests (status);
create index requests_visit_idx on public.requests (visit_day, driver_id);
create index requests_branch_idx on public.requests (branch_id, created_at desc);
create index requests_material_idx on public.requests (material_id);
create index requests_created_idx on public.requests (created_at desc);

-- Every visit outcome recorded by a driver (or by the end-of-day sweep).
create table public.visit_attempts (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.requests (id) on delete cascade,
  visit_day date not null,
  driver_id uuid not null references public.drivers (id),
  outcome public.visit_outcome not null,
  reason_id uuid references public.reasons (id),
  reason_text text,
  note text,
  photo_path text,
  recorded_at timestamptz not null default now()
);
create index visit_attempts_request_idx on public.visit_attempts (request_id, recorded_at);

-- Status history shown in the request drawer / branch timeline.
create table public.request_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.requests (id) on delete cascade,
  from_status public.request_status, -- null = created
  to_status public.request_status not null,
  actor_kind public.actor_kind not null,
  actor_id uuid,
  note text,
  created_at timestamptz not null default now()
);
create index request_events_request_idx on public.request_events (request_id, created_at);

-- Who approved each driver's plan for a day (a plan can be extended several times).
create table public.plan_approvals (
  id bigint generated always as identity primary key,
  visit_day date not null,
  driver_id uuid not null references public.drivers (id),
  approved_by uuid not null references public.profiles (id),
  approved_at timestamptz not null default now()
);
create index plan_approvals_day_idx on public.plan_approvals (visit_day, driver_id);

-- In-app notifications for every account type. Push delivery (FCM) reads from here later.
create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title_ar text not null,
  title_en text not null,
  body_ar text,
  body_en text,
  link text,
  request_id uuid references public.requests (id) on delete set null,
  material_id uuid references public.materials (id),
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger requests_touch before update on public.requests
for each row execute function private.touch_updated_at();
