create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;
grant usage on schema private to authenticated;

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  role text not null check (role in ('couple', 'planner', 'vendor')),
  handle text not null unique,
  display_name text not null default '',
  initials text not null default '',
  company_name text not null default '',
  city text not null default '',
  bio text not null default '',
  avatar_url text,
  is_public boolean not null default false,
  is_complete boolean not null default false,
  is_demo boolean not null default false,
  is_approved boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.couple_requirements (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  partner_names text not null default '',
  initials text not null default '',
  wedding_date date,
  city text not null default '',
  guest_count integer check (guest_count is null or guest_count >= 0),
  budget_min numeric(12,2) check (budget_min is null or budget_min >= 0),
  budget_max numeric(12,2) check (budget_max is null or budget_max >= 0),
  services text[] not null default '{}',
  priorities text[] not null default '{}',
  notes text not null default '',
  visible_to_pros boolean not null default true,
  updated_at timestamptz not null default now(),
  check (budget_min is null or budget_max is null or budget_max >= budget_min)
);

create table if not exists public.profile_services (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  service_name text not null check (length(trim(service_name)) between 1 and 100),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, service_name)
);

create table if not exists public.profile_portfolio (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  image_url text not null,
  alt_text text not null default '',
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  unique (profile_id, image_url)
);

create table if not exists public.moodboards (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'Wedding moodboard',
  event_type text not null default '',
  style text not null default '',
  summary text not null default '',
  image_urls text[] not null default '{}',
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.planner_requests (
  id uuid primary key default gen_random_uuid(),
  couple_profile_id uuid not null references public.profiles(id) on delete cascade,
  moodboard_id uuid references public.moodboards(id) on delete set null,
  services text[] not null default '{}',
  priorities text[] not null default '{}',
  notes text not null default '',
  status text not null default 'open' check (status in ('open', 'viewed', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists profiles_role_public_idx on public.profiles(role, is_public, is_complete);
create index if not exists planner_requests_status_idx on public.planner_requests(status, created_at desc);
create index if not exists moodboards_profile_idx on public.moodboards(profile_id, created_at desc);
create index if not exists profile_portfolio_order_idx on public.profile_portfolio(profile_id, display_order);

create or replace function private.current_app_role()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select p.role from public.profiles p where p.id = (select auth.uid()) limit 1
$$;

grant execute on function private.current_app_role() to authenticated;

create or replace function private.can_view_couple_requests()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('planner', 'vendor')
      and (p.is_demo or p.is_approved)
  )
$$;

grant execute on function private.can_view_couple_requests() to authenticated;

create or replace function private.protect_profile_role()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.role is distinct from new.role then
    raise exception 'Profile role cannot be changed';
  end if;
  return new;
end
$$;

drop trigger if exists profiles_protect_role on public.profiles;
create trigger profiles_protect_role before update on public.profiles
for each row execute function private.protect_profile_role();

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$ begin new.updated_at = now(); return new; end $$;

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles
for each row execute function private.set_updated_at();
drop trigger if exists couple_requirements_updated_at on public.couple_requirements;
create trigger couple_requirements_updated_at before update on public.couple_requirements
for each row execute function private.set_updated_at();
drop trigger if exists moodboards_updated_at on public.moodboards;
create trigger moodboards_updated_at before update on public.moodboards
for each row execute function private.set_updated_at();
drop trigger if exists planner_requests_updated_at on public.planner_requests;
create trigger planner_requests_updated_at before update on public.planner_requests
for each row execute function private.set_updated_at();

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  selected_role text;
  candidate_handle text;
  base_name text;
begin
  selected_role := lower(coalesce(new.raw_user_meta_data ->> 'role', 'couple'));
  if selected_role = 'professional' then selected_role := 'planner'; end if;
  if selected_role not in ('couple', 'planner', 'vendor') then selected_role := 'couple'; end if;
  base_name := coalesce(nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''), split_part(new.email, '@', 1), 'New member');
  candidate_handle := trim(both '-' from regexp_replace(lower(base_name), '[^a-z0-9]+', '-', 'g'));
  if candidate_handle = '' then candidate_handle := 'member'; end if;
  candidate_handle := left(candidate_handle, 32) || '-' || left(replace(new.id::text, '-', ''), 8);

  insert into public.profiles (id, role, handle, display_name)
  values (new.id, selected_role, candidate_handle, base_name)
  on conflict (id) do nothing;
  return new;
end
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile after insert on auth.users
for each row execute function public.create_profile_for_new_user();

insert into public.profiles (id, role, handle, display_name)
select u.id,
  case when u.raw_user_meta_data ->> 'role' in ('planner', 'professional') then 'planner'
       when u.raw_user_meta_data ->> 'role' = 'vendor' then 'vendor' else 'couple' end,
  left(trim(both '-' from regexp_replace(lower(coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1), 'member')), '[^a-z0-9]+', '-', 'g')), 32)
    || '-' || left(replace(u.id::text, '-', ''), 8),
  coalesce(nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''), split_part(u.email, '@', 1), 'New member')
from auth.users u
on conflict (id) do nothing;

alter table public.profiles enable row level security;
alter table public.couple_requirements enable row level security;
alter table public.profile_services enable row level security;
alter table public.profile_portfolio enable row level security;
alter table public.moodboards enable row level security;
alter table public.planner_requests enable row level security;

revoke all on public.profiles, public.couple_requirements, public.profile_services, public.profile_portfolio, public.moodboards, public.planner_requests from anon, authenticated;
grant select on public.profiles, public.couple_requirements, public.profile_services, public.profile_portfolio, public.moodboards, public.planner_requests to anon, authenticated;
grant update (display_name, initials, company_name, city, bio, avatar_url, handle, is_public, is_complete) on public.profiles to authenticated;
grant insert, update, delete on public.couple_requirements, public.profile_services, public.profile_portfolio, public.moodboards to authenticated;
grant insert on public.planner_requests to authenticated;
grant update (status) on public.planner_requests to authenticated;

drop policy if exists "Public or own profiles" on public.profiles;
create policy "Public or own profiles" on public.profiles for select to anon, authenticated
using (is_demo or (is_public and is_complete) or id = (select auth.uid()));
drop policy if exists "Owners update own profile" on public.profiles;
create policy "Owners update own profile" on public.profiles for update to authenticated
using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "Couples and pros read visible requirements" on public.couple_requirements;
create policy "Couples and pros read visible requirements" on public.couple_requirements for select to authenticated
using (
  profile_id = (select auth.uid())
  or (visible_to_pros and private.current_app_role() in ('planner', 'vendor')
      and exists (select 1 from public.profiles p where p.id = profile_id
        and (p.is_demo or (private.can_view_couple_requests() and p.is_public and p.is_complete))))
);
drop policy if exists "Couples manage own requirements" on public.couple_requirements;
create policy "Couples manage own requirements" on public.couple_requirements for all to authenticated
using (profile_id = (select auth.uid()) and private.current_app_role() = 'couple')
with check (profile_id = (select auth.uid()) and private.current_app_role() = 'couple');

drop policy if exists "Read services on visible profiles" on public.profile_services;
create policy "Read services on visible profiles" on public.profile_services for select to anon, authenticated
using (exists (select 1 from public.profiles p where p.id = profile_id and (p.is_demo or (p.is_public and p.is_complete) or p.id = (select auth.uid()))));
drop policy if exists "Owners manage services" on public.profile_services;
create policy "Owners manage services" on public.profile_services for all to authenticated
using (profile_id = (select auth.uid()) and private.current_app_role() in ('planner', 'vendor'))
with check (profile_id = (select auth.uid()) and private.current_app_role() in ('planner', 'vendor'));

drop policy if exists "Read portfolio on visible profiles" on public.profile_portfolio;
create policy "Read portfolio on visible profiles" on public.profile_portfolio for select to anon, authenticated
using (exists (select 1 from public.profiles p where p.id = profile_id and (p.is_demo or (p.is_public and p.is_complete) or p.id = (select auth.uid()))));
drop policy if exists "Owners manage portfolio" on public.profile_portfolio;
create policy "Owners manage portfolio" on public.profile_portfolio for all to authenticated
using (profile_id = (select auth.uid()) and private.current_app_role() in ('planner', 'vendor'))
with check (profile_id = (select auth.uid()) and private.current_app_role() in ('planner', 'vendor'));

drop policy if exists "Read visible moodboards" on public.moodboards;
create policy "Read visible moodboards" on public.moodboards for select to anon, authenticated
using (exists (select 1 from public.profiles p where p.id = profile_id and (p.id = (select auth.uid()) or p.is_demo or (p.is_public and p.is_complete and is_public))));
drop policy if exists "Couples manage own moodboards" on public.moodboards;
create policy "Couples manage own moodboards" on public.moodboards for all to authenticated
using (profile_id = (select auth.uid()) and private.current_app_role() = 'couple')
with check (profile_id = (select auth.uid()) and private.current_app_role() = 'couple');

drop policy if exists "Couples and pros read requests" on public.planner_requests;
create policy "Couples and pros read requests" on public.planner_requests for select to authenticated
using (
  couple_profile_id = (select auth.uid())
  or (private.current_app_role() in ('planner', 'vendor') and exists (
    select 1 from public.profiles p where p.id = couple_profile_id
      and (p.is_demo or (private.can_view_couple_requests() and p.is_public and p.is_complete))
  ))
);
drop policy if exists "Couples create own requests" on public.planner_requests;
create policy "Couples create own requests" on public.planner_requests for insert to authenticated
with check (couple_profile_id = (select auth.uid()) and private.current_app_role() = 'couple');
drop policy if exists "Couples and pros update request status" on public.planner_requests;
create policy "Couples and pros update request status" on public.planner_requests for update to authenticated
using (couple_profile_id = (select auth.uid()) or private.can_view_couple_requests())
with check (couple_profile_id = (select auth.uid()) or private.can_view_couple_requests());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-media', 'profile-media', true, 8388608, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Read public profile media" on storage.objects;
create policy "Read public profile media" on storage.objects for select to anon, authenticated
using (bucket_id = 'profile-media');
drop policy if exists "Upload own profile media" on storage.objects;
create policy "Upload own profile media" on storage.objects for insert to authenticated
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Update own profile media" on storage.objects;
create policy "Update own profile media" on storage.objects for update to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text)
with check (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
drop policy if exists "Delete own profile media" on storage.objects;
create policy "Delete own profile media" on storage.objects for delete to authenticated
using (bucket_id = 'profile-media' and (storage.foldername(name))[1] = (select auth.uid())::text);
