-- Clouds Water Ecosystem — 01: types and reference data tables
-- Reference tables are managed from the dashboard admin screens (cities, districts, chains, materials, lists).

create schema if not exists private;

create type public.app_role as enum ('staff', 'branch', 'driver');
create type public.request_status as enum ('waiting', 'scheduled', 'needs_decision', 'completed', 'closed', 'cancelled');
create type public.visit_outcome as enum ('full', 'partial', 'failed', 'no_result');
create type public.actor_kind as enum ('staff', 'branch', 'driver', 'system');
create type public.reason_kind as enum ('cancel', 'close', 'failed', 'partial');

create table public.cities (
  id uuid primary key default gen_random_uuid(),
  -- Stable latin key the apps use for icons, colours and URLs (e.g. "jed", "plas").
  code text not null unique check (code ~ '^[a-z0-9_]{2,20}$'),
  name_ar text not null,
  name_en text not null,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique (name_ar)
);

create table public.districts (
  id uuid primary key default gen_random_uuid(),
  city_id uuid not null references public.cities (id),
  name_ar text not null,
  name_en text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (city_id, name_ar)
);
create index districts_city_idx on public.districts (city_id);

create table public.chains (
  id uuid primary key default gen_random_uuid(),
  -- Short latin code used to build branch login names (e.g. "othaim" → b-othaim-207@…)
  code text not null unique check (code ~ '^[a-z0-9]{2,20}$'),
  name_ar text not null,
  name_en text not null,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.materials (
  id uuid primary key default gen_random_uuid(),
  -- Stable latin key the apps use for icons, colours and URLs (e.g. "jed", "plas").
  code text not null unique check (code ~ '^[a-z0-9_]{2,20}$'),
  name_ar text not null unique,
  name_en text not null,
  color_light text not null default '#5C6B7E' check (color_light ~ '^#[0-9A-Fa-f]{6}$'),
  color_dark text not null default '#9AA9BC' check (color_dark ~ '^#[0-9A-Fa-f]{6}$'),
  icon text not null default 'cube', -- icon key understood by the apps
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.material_subtypes (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code ~ '^[a-z0-9_]{2,20}$'),
  material_id uuid not null references public.materials (id),
  name_ar text not null,
  name_en text not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (material_id, name_ar),
  unique (id, material_id) -- lets requests enforce "subtype belongs to material" with a composite FK
);

-- Editable lists: cancel reasons (ops), close reasons (decisions), driver failed / partial reasons.
create table public.reasons (
  id uuid primary key default gen_random_uuid(),
  kind public.reason_kind not null,
  label_ar text not null,
  label_en text not null,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (kind, label_ar)
);
