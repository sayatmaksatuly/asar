begin;

create extension if not exists pgcrypto;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.app_language as enum ('ru', 'kk');
create type public.user_role as enum ('requester', 'volunteer', 'admin');
create type public.user_status as enum ('active', 'blocked', 'pending');
create type public.verification_status as enum ('unverified', 'pending', 'verified', 'rejected');
create type public.request_status as enum ('draft', 'open', 'volunteer_selected', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled', 'disputed');
create type public.response_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');
create type public.assignment_status as enum ('volunteer_selected', 'in_progress', 'awaiting_confirmation', 'completed', 'cancelled', 'disputed');
create type public.urgency_level as enum ('low', 'normal', 'high', 'urgent');
create type public.help_format as enum ('in_person', 'remote', 'delivery', 'transport');
create type public.bonus_reason as enum ('assignment_completion', 'urgent_completion', 'positive_review', 'admin_adjustment');
create type public.report_target_type as enum ('profile', 'request', 'response', 'assignment');
create type public.report_status as enum ('open', 'reviewing', 'resolved', 'dismissed');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 2 and 100),
  email text,
  phone text,
  avatar_url text,
  role public.user_role not null default 'requester',
  city text,
  district text,
  preferred_language public.app_language not null default 'ru',
  status public.user_status not null default 'active',
  rating numeric(3,2) not null default 0 check (rating between 0 and 5),
  completed_tasks_count integer not null default 0 check (completed_tasks_count >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.volunteer_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  bio text check (char_length(bio) <= 1200),
  skills text[] not null default '{}',
  availability text,
  verification_status public.verification_status not null default 'unverified',
  bonus_balance integer not null default 0 check (bonus_balance >= 0),
  level integer not null default 1 check (level between 1 and 20),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name_ru text not null,
  name_kk text not null,
  description_ru text,
  description_kk text,
  icon text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.volunteer_categories (
  volunteer_id uuid not null references public.volunteer_profiles(user_id) on delete cascade,
  category_id uuid not null references public.categories(id) on delete cascade,
  primary key (volunteer_id, category_id)
);

create table public.help_requests (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 5 and 120),
  description text not null check (char_length(description) between 20 and 3000),
  content_language public.app_language not null,
  category_id uuid not null references public.categories(id),
  city text not null,
  district text not null,
  desired_date date,
  time_from time,
  time_to time,
  urgency public.urgency_level not null default 'normal',
  help_format public.help_format not null default 'in_person',
  status public.request_status not null default 'draft',
  image_url text,
  special_conditions text check (char_length(special_conditions) <= 1000),
  selected_volunteer_id uuid references public.volunteer_profiles(user_id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (time_to is null or time_from is null or time_to > time_from)
);

create table public.request_private_details (
  request_id uuid primary key references public.help_requests(id) on delete cascade,
  address text not null check (char_length(address) between 3 and 240),
  location_notes text check (char_length(location_notes) <= 240),
  preferred_contact_method text check (char_length(preferred_contact_method) <= 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.responses (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete cascade,
  volunteer_id uuid not null references public.volunteer_profiles(user_id) on delete cascade,
  message text not null check (char_length(message) between 10 and 1000),
  status public.response_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index responses_one_active_per_request
  on public.responses(request_id, volunteer_id)
  where status in ('pending', 'accepted');

create table public.assignments (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.help_requests(id) on delete restrict,
  volunteer_id uuid not null references public.volunteer_profiles(user_id) on delete restrict,
  started_at timestamptz,
  volunteer_completed_at timestamptz,
  requester_confirmed_at timestamptz,
  status public.assignment_status not null default 'volunteer_selected',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  assignment_id uuid not null references public.assignments(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  text text check (char_length(text) <= 1200),
  created_at timestamptz not null default now(),
  unique (assignment_id, author_id),
  check (author_id <> receiver_id)
);

create table public.bonus_transactions (
  id uuid primary key default gen_random_uuid(),
  volunteer_id uuid not null references public.volunteer_profiles(user_id) on delete restrict,
  assignment_id uuid references public.assignments(id) on delete restrict,
  amount integer not null check (amount <> 0 and amount between -10000 and 10000),
  reason public.bonus_reason not null,
  note text check (char_length(note) <= 500),
  created_at timestamptz not null default now()
);

create unique index bonus_one_completion_per_assignment
  on public.bonus_transactions(assignment_id)
  where assignment_id is not null and reason in ('assignment_completion', 'urgent_completion');
create unique index bonus_one_review_per_assignment
  on public.bonus_transactions(assignment_id)
  where assignment_id is not null and reason = 'positive_review';

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  target_type public.report_target_type not null,
  target_id uuid not null,
  reason text not null check (char_length(reason) between 3 and 160),
  description text check (char_length(description) <= 1500),
  status public.report_status not null default 'open',
  reviewed_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.achievements (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name_ru text not null,
  name_kk text not null,
  description_ru text,
  description_kk text,
  icon text,
  required_completed_tasks integer not null default 0,
  created_at timestamptz not null default now()
);

create table public.volunteer_achievements (
  volunteer_id uuid not null references public.volunteer_profiles(user_id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  awarded_at timestamptz not null default now(),
  primary key (volunteer_id, achievement_id)
);

create index help_requests_status_created_idx on public.help_requests(status, created_at desc);
create index help_requests_author_idx on public.help_requests(author_id);
create index help_requests_filters_idx on public.help_requests(category_id, city, district, urgency, content_language);
create index responses_request_idx on public.responses(request_id);
create index responses_volunteer_idx on public.responses(volunteer_id);
create index assignments_volunteer_idx on public.assignments(volunteer_id, status);
create index reviews_receiver_idx on public.reviews(receiver_id);
create index bonus_volunteer_idx on public.bonus_transactions(volunteer_id, created_at desc);
create index reports_status_idx on public.reports(status, created_at desc);

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(select 1 from public.profiles where id = (select auth.uid()) and role = 'admin' and status = 'active');
$$;

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now(); return new; end;
$$;

create trigger profiles_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger volunteer_profiles_updated_at before update on public.volunteer_profiles for each row execute function public.set_updated_at();
create trigger help_requests_updated_at before update on public.help_requests for each row execute function public.set_updated_at();
create trigger request_private_details_updated_at before update on public.request_private_details for each row execute function public.set_updated_at();
create trigger responses_updated_at before update on public.responses for each row execute function public.set_updated_at();
create trigger assignments_updated_at before update on public.assignments for each row execute function public.set_updated_at();
create trigger reports_updated_at before update on public.reports for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_role public.user_role;
  safe_language public.app_language;
begin
  safe_role := case when new.raw_user_meta_data->>'role' = 'volunteer' then 'volunteer'::public.user_role else 'requester'::public.user_role end;
  safe_language := case when new.raw_user_meta_data->>'preferred_language' = 'kk' then 'kk'::public.app_language else 'ru'::public.app_language end;
  insert into public.profiles(id, full_name, email, role, preferred_language)
  values (new.id, coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, 'ASAR'), '@', 1)), new.email, safe_role, safe_language);
  if safe_role = 'volunteer' then insert into public.volunteer_profiles(user_id) values (new.id); end if;
  return new;
end;
$$;

create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.protect_profile_role()
returns trigger language plpgsql set search_path = public, private as $$
begin
  if new.role <> old.role and current_user not in ('postgres', 'service_role', 'supabase_admin') and not private.is_admin() then
    raise exception 'role_change_forbidden' using errcode = '42501';
  end if;
  return new;
end;
$$;
create trigger protect_profile_role before update on public.profiles for each row execute function public.protect_profile_role();

create or replace function public.protect_request_critical_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if new.author_id <> old.author_id or new.selected_volunteer_id is distinct from old.selected_volunteer_id then raise exception 'critical_fields_forbidden' using errcode = '42501'; end if;
    if old.status not in ('draft', 'open') and row(new.title,new.description,new.category_id,new.city,new.district,new.desired_date,new.time_from,new.time_to,new.urgency,new.help_format,new.image_url,new.special_conditions) is distinct from row(old.title,old.description,old.category_id,old.city,old.district,old.desired_date,old.time_from,old.time_to,old.urgency,old.help_format,old.image_url,old.special_conditions) then raise exception 'completed_request_locked' using errcode = '42501'; end if;
    if new.status <> old.status and not (old.status in ('draft','open') and new.status = 'cancelled') then raise exception 'status_transition_forbidden' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;
create trigger protect_request_critical_fields before update on public.help_requests for each row execute function public.protect_request_critical_fields();

create view public.public_profiles with (security_barrier = true) as
select id, full_name, avatar_url, role, city, district, rating, completed_tasks_count
from public.profiles where status = 'active';

create view public.public_help_requests with (security_barrier = true) as
select r.id, r.author_id, r.title, r.description, r.content_language, r.category_id,
  c.slug as category_slug, c.name_ru as category_name_ru, c.name_kk as category_name_kk,
  r.city, r.district, r.desired_date, r.time_from, r.time_to, r.urgency, r.help_format,
  r.status, r.image_url, r.special_conditions, r.created_at,
  (select count(*)::integer from public.responses x where x.request_id = r.id and x.status <> 'withdrawn') as response_count,
  p.full_name as author_name, p.rating as author_rating, p.avatar_url as author_avatar_url
from public.help_requests r
join public.categories c on c.id = r.category_id
join public.profiles p on p.id = r.author_id
where r.status in ('open', 'volunteer_selected', 'in_progress', 'awaiting_confirmation', 'completed') and p.status = 'active';

revoke all on public.profiles, public.volunteer_profiles, public.request_private_details from anon;
grant select on public.public_profiles, public.public_help_requests to anon, authenticated;

commit;
