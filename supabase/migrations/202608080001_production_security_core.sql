begin;

-- ASAR 1.0 production hardening. This migration is additive/non-destructive and
-- preserves existing user and marketplace data while moving critical writes to RPCs.

alter table public.profiles
  add column if not exists can_request boolean not null default true,
  add column if not exists can_volunteer boolean not null default false,
  add column if not exists transactional_email_enabled boolean not null default true,
  add column if not exists marketing_email_enabled boolean not null default false,
  add column if not exists last_active_at timestamptz,
  add column if not exists deleted_at timestamptz;

update public.profiles
set can_request = true,
    can_volunteer = coalesce(can_volunteer, false) or role in ('volunteer','admin')
where deleted_at is null;

-- Admin authorization requires both the admin role and an AAL2 session (MFA).
create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path=public
as $$
  select coalesce(auth.jwt()->>'aal','aal1')='aal2'
    and exists(select 1 from public.profiles where id=auth.uid() and role='admin' and status='active' and deleted_at is null);
$$;


alter table public.volunteer_profiles
  add column if not exists verification_requested_at timestamptz;

alter table public.assignments
  add column if not exists cancelled_by uuid references public.profiles(id) on delete set null,
  add column if not exists cancellation_reason text check (cancellation_reason is null or char_length(cancellation_reason) between 3 and 500),
  add column if not exists cancelled_at timestamptz;

alter table public.reports
  add column if not exists resolution_note text check (resolution_note is null or char_length(resolution_note) <= 1500),
  add column if not exists resolved_at timestamptz;

alter table public.moderation_actions
  add column if not exists target_type text,
  add column if not exists target_id uuid;

-- Keep assignment history so a request can be safely reassigned after cancellation.
alter table public.assignments drop constraint if exists assignments_request_id_key;
create unique index if not exists assignments_one_active_per_request
  on public.assignments(request_id)
  where status in ('volunteer_selected','in_progress','awaiting_confirmation','disputed');

create index if not exists assignments_request_history_idx
  on public.assignments(request_id, created_at desc);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (char_length(type) between 2 and 80),
  actor_id uuid references public.profiles(id) on delete set null,
  title_key text not null,
  body_key text,
  link text check (link is null or left(link, 1) = '/'),
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_unread_idx on public.notifications(user_id, read_at, created_at desc);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  recipient_email text not null,
  event_type text not null,
  locale public.app_language not null default 'ru',
  payload jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','processing','sent','failed','cancelled')),
  attempts smallint not null default 0 check (attempts between 0 and 20),
  last_error text,
  available_at timestamptz not null default now(),
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists email_outbox_pending_idx on public.email_outbox(status, available_at, created_at);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.help_requests(id) on delete restrict,
  assignment_id uuid not null references public.assignments(id) on delete restrict,
  opened_by uuid not null references public.profiles(id) on delete restrict,
  reason text not null check (reason in ('no_show','help_not_provided','requester_unresponsive','false_completion','inappropriate_behaviour','unsafe_behaviour','fraud_scam','other')),
  description text check (description is null or char_length(description) <= 2000),
  status text not null default 'open' check (status in ('open','reviewing','resolved','dismissed')),
  resolution_action text,
  resolution_note text,
  resolved_by uuid references public.profiles(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists disputes_one_open_per_assignment on public.disputes(assignment_id) where status in ('open','reviewing');
create index if not exists disputes_status_idx on public.disputes(status, created_at desc);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('identity','community')),
  status public.verification_status not null default 'pending',
  note text check (note is null or char_length(note) <= 1000),
  reviewed_by uuid references public.profiles(id) on delete set null,
  review_reason text check (review_reason is null or char_length(review_reason) <= 1000),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists verification_one_pending_per_kind on public.verification_requests(user_id, kind) where status = 'pending';

create table if not exists public.user_consents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  document_type text not null check (document_type in ('terms','privacy','request_safety','age_18')),
  version text not null check (char_length(version) between 1 and 40),
  request_id uuid references public.help_requests(id) on delete set null,
  accepted_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create unique index if not exists user_consents_version_unique on public.user_consents(user_id, document_type, version, coalesce(request_id, '00000000-0000-0000-0000-000000000000'::uuid));

create table if not exists public.account_deletion_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete restrict,
  status text not null default 'requested' check (status in ('requested','anonymized','purged','cancelled','failed')),
  requested_at timestamptz not null default now(),
  anonymized_at timestamptz,
  purged_at timestamptz,
  error_note text,
  unique(user_id, status)
);

create table if not exists public.product_events (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  session_id text,
  event_name text not null check (event_name in ('landing_visit','signup','onboarding_complete','request_create','request_viewed','response_created','response_withdrawn','volunteer_selected','assignment_started','assignment_completed','completion_confirmed','reviewed')),
  request_id uuid references public.help_requests(id) on delete set null,
  assignment_id uuid references public.assignments(id) on delete set null,
  locale public.app_language,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists product_events_name_created_idx on public.product_events(event_name, created_at desc);
create index if not exists product_events_user_created_idx on public.product_events(user_id, created_at desc);


create table if not exists public.abuse_rate_events (
  id bigint generated always as identity primary key,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  scope text not null check (char_length(scope) between 2 and 80),
  created_at timestamptz not null default now()
);
create index if not exists abuse_rate_events_actor_scope_idx on public.abuse_rate_events(actor_id,scope,created_at desc);

create or replace function private.enforce_rate_limit(p_scope text,p_limit integer,p_window interval)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare attempts integer;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  if p_limit < 1 or p_window <= interval '0 seconds' then raise exception 'invalid_rate_limit' using errcode='22023'; end if;
  perform pg_advisory_xact_lock(hashtextextended(auth.uid()::text||':'||p_scope,0));
  select count(*)::integer into attempts from public.abuse_rate_events where actor_id=auth.uid() and scope=p_scope and created_at>=now()-p_window;
  if attempts>=p_limit then raise exception 'rate_limited' using errcode='P0001'; end if;
  insert into public.abuse_rate_events(actor_id,scope) values(auth.uid(),p_scope);
end;
$$;

create or replace function public.consume_rate_limit(p_scope text,p_limit integer,p_window_seconds integer)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
begin
  if p_scope not in ('image_upload','verification','request_create','response_create','report_create','dispute_create') then raise exception 'invalid_rate_limit_scope' using errcode='22023'; end if;
  perform private.enforce_rate_limit(p_scope,greatest(1,least(p_limit,100)),make_interval(secs=>greatest(60,least(p_window_seconds,86400))));
end;
$$;

create table if not exists public.regions (
  id smallint generated always as identity primary key,
  code text not null unique,
  name_ru text not null,
  name_kk text not null
);
create table if not exists public.cities (
  id integer generated always as identity primary key,
  region_id smallint references public.regions(id) on delete restrict,
  slug text not null unique,
  name_ru text not null,
  name_kk text not null,
  aliases text[] not null default '{}',
  is_active boolean not null default true
);
create table if not exists public.districts (
  id integer generated always as identity primary key,
  city_id integer not null references public.cities(id) on delete cascade,
  slug text not null,
  name_ru text not null,
  name_kk text not null,
  is_active boolean not null default true,
  unique(city_id, slug)
);

insert into public.regions(code,name_ru,name_kk) values
 ('astana','Астана','Астана'),('almaty-city','Алматы','Алматы'),('shymkent','Шымкент','Шымкент'),
 ('abay','Абайская область','Абай облысы'),('akmola','Акмолинская область','Ақмола облысы'),('aktobe','Актюбинская область','Ақтөбе облысы'),
 ('almaty-region','Алматинская область','Алматы облысы'),('atyrau','Атырауская область','Атырау облысы'),('east-kazakhstan','Восточно-Казахстанская область','Шығыс Қазақстан облысы'),
 ('zhambyl','Жамбылская область','Жамбыл облысы'),('zhetisu','Жетысуская область','Жетісу облысы'),('west-kazakhstan','Западно-Казахстанская область','Батыс Қазақстан облысы'),
 ('karaganda','Карагандинская область','Қарағанды облысы'),('kostanay','Костанайская область','Қостанай облысы'),('kyzylorda','Кызылординская область','Қызылорда облысы'),
 ('mangystau','Мангистауская область','Маңғыстау облысы'),('pavlodar','Павлодарская область','Павлодар облысы'),('north-kazakhstan','Северо-Казахстанская область','Солтүстік Қазақстан облысы'),
 ('turkistan','Туркестанская область','Түркістан облысы'),('ulytau','Улытауская область','Ұлытау облысы')
on conflict (code) do update set name_ru=excluded.name_ru,name_kk=excluded.name_kk;

insert into public.cities(region_id,slug,name_ru,name_kk,aliases)
select r.id, v.slug, v.name_ru, v.name_kk, v.aliases
from (values
 ('astana','astana','Астана','Астана',array['Nur-Sultan','Нур-Султан']),
 ('almaty-city','almaty','Алматы','Алматы',array[]::text[]),
 ('shymkent','shymkent','Шымкент','Шымкент',array[]::text[]),
 ('kyzylorda','qyzylorda','Кызылорда','Қызылорда',array['Кызыл Орда','Qyzylorda']),
 ('aktobe','aktobe','Актобе','Ақтөбе',array['Aktobe']),
 ('atyrau','atyrau','Атырау','Атырау',array[]::text[]),
 ('karaganda','karaganda','Караганда','Қарағанды',array['Karaganda']),
 ('kostanay','kostanay','Костанай','Қостанай',array['Kostanai']),
 ('pavlodar','pavlodar','Павлодар','Павлодар',array[]::text[]),
 ('east-kazakhstan','oskemen','Усть-Каменогорск','Өскемен',array['Oskemen','Өскемен']),
 ('west-kazakhstan','oral','Уральск','Орал',array['Oral']),
 ('north-kazakhstan','petropavl','Петропавловск','Петропавл',array['Petropavl']),
 ('zhambyl','taraz','Тараз','Тараз',array[]::text[]),
 ('turkistan','turkistan','Туркестан','Түркістан',array[]::text[]),
 ('mangystau','aktau','Актау','Ақтау',array['Aktau']),
 ('akmola','kokshetau','Кокшетау','Көкшетау',array['Kokshetau']),
 ('zhetisu','taldykorgan','Талдыкорган','Талдықорған',array['Taldykorgan']),
 ('abay','semey','Семей','Семей',array['Semey']),
 ('ulytau','zhezkazgan','Жезказган','Жезқазған',array['Zhezkazgan'])
) as v(region_code,slug,name_ru,name_kk,aliases)
join public.regions r on r.code=v.region_code
on conflict (slug) do update set region_id=excluded.region_id,name_ru=excluded.name_ru,name_kk=excluded.name_kk,aliases=excluded.aliases;

insert into public.districts(city_id,slug,name_ru,name_kk)
select c.id,v.slug,v.name_ru,v.name_kk from (values
 ('astana','almaty','Алматы','Алматы'),('astana','baikonyr','Байконур','Байқоңыр'),('astana','esil','Есиль','Есіл'),('astana','nura','Нура','Нұра'),('astana','sarayishyq','Сарайшык','Сарайшық'),
 ('almaty','alatausky','Алатауский','Алатау'),('almaty','almalinsky','Алмалинский','Алмалы'),('almaty','auezovsky','Ауэзовский','Әуезов'),('almaty','bostandyksky','Бостандыкский','Бостандық'),('almaty','zhetysusky','Жетысуский','Жетісу'),('almaty','medeusky','Медеуский','Медеу'),('almaty','nauryzbaisky','Наурызбайский','Наурызбай'),('almaty','turksibsky','Турксибский','Түрксіб'),
 ('shymkent','abai','Абайский','Абай'),('shymkent','al-farabi','Аль-Фарабийский','Әл-Фараби'),('shymkent','enbekshi','Енбекшинский','Еңбекші'),('shymkent','karatau','Каратауский','Қаратау'),('shymkent','turan','Туранский','Тұран')
) as v(city_slug,slug,name_ru,name_kk)
join public.cities c on c.slug=v.city_slug
on conflict(city_id,slug) do update set name_ru=excluded.name_ru,name_kk=excluded.name_kk;

alter table public.profiles
  add column if not exists city_id integer references public.cities(id) on delete set null,
  add column if not exists district_id integer references public.districts(id) on delete set null;

update public.profiles p
set city_id=c.id
from public.cities c
where p.city_id is null and p.city is not null
  and (lower(trim(p.city))=lower(c.name_ru) or lower(trim(p.city))=lower(c.name_kk) or lower(trim(p.city))=any(select lower(x) from unnest(c.aliases) x));

update public.profiles p
set district_id=d.id
from public.districts d
where p.district_id is null and p.city_id=d.city_id and p.district is not null
  and (lower(trim(p.district))=lower(d.name_ru) or lower(trim(p.district))=lower(d.name_kk));

alter table public.help_requests
  add column if not exists city_id integer references public.cities(id) on delete restrict,
  add column if not exists district_id integer references public.districts(id) on delete set null;

update public.help_requests r
set city_id = c.id
from public.cities c
where r.city_id is null and (lower(trim(r.city)) = lower(c.name_ru) or lower(trim(r.city)) = lower(c.name_kk) or lower(trim(r.city)) = any(select lower(x) from unnest(c.aliases) x));

create or replace function private.require_active_user()
returns public.profiles
language plpgsql
stable
security definer
set search_path = public
as $$
declare p public.profiles;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into p from public.profiles where id=auth.uid();
  if p.id is null then raise exception 'profile_missing' using errcode='42501'; end if;
  if p.status <> 'active' or p.deleted_at is not null then raise exception 'user_blocked' using errcode='42501'; end if;
  return p;
end;
$$;

create or replace function private.enqueue_notification(
  p_user_id uuid,
  p_type text,
  p_title_key text,
  p_body_key text default null,
  p_link text default null,
  p_actor_id uuid default null,
  p_payload jsonb default '{}'::jsonb,
  p_send_email boolean default false
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare n_id uuid; p public.profiles;
begin
  if p_user_id is null or p_user_id = p_actor_id then return null; end if;
  insert into public.notifications(user_id,type,actor_id,title_key,body_key,link,payload)
  values(p_user_id,p_type,p_actor_id,p_title_key,p_body_key,p_link,coalesce(p_payload,'{}'::jsonb)) returning id into n_id;
  if p_send_email then
    select * into p from public.profiles where id=p_user_id;
    if p.transactional_email_enabled and p.email is not null and p.deleted_at is null then
      insert into public.email_outbox(user_id,recipient_email,event_type,locale,payload)
      values(p_user_id,p.email,p_type,p.preferred_language,coalesce(p_payload,'{}'::jsonb) || jsonb_build_object('link',p_link));
    end if;
  end if;
  return n_id;
end;
$$;

create or replace function public.normalize_profile_location()
returns trigger
language plpgsql
set search_path=public
as $$
declare c public.cities; d public.districts;
begin
  if new.city_id is null then
    if (new.city is distinct from old.city or new.district is distinct from old.district) and (new.city is not null or new.district is not null) then
      raise exception 'invalid_city' using errcode='22023';
    end if;
    new.district_id:=null;
    return new;
  end if;
  select * into c from public.cities where id=new.city_id and is_active;
  if c.id is null then raise exception 'invalid_city' using errcode='22023'; end if;
  new.city:=c.name_ru;
  if new.district_id is not null then
    select * into d from public.districts where id=new.district_id and city_id=new.city_id and is_active;
    if d.id is null then raise exception 'invalid_district' using errcode='22023'; end if;
    new.district:=d.name_ru;
  elsif new.district is distinct from old.district and new.district is not null and char_length(trim(new.district))>100 then
    raise exception 'invalid_district' using errcode='22023';
  end if;
  return new;
end;
$$;
drop trigger if exists normalize_profile_location on public.profiles;
create trigger normalize_profile_location before update on public.profiles for each row execute function public.normalize_profile_location();

create or replace function public.protect_profile_system_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin') and not private.is_admin() then
    if old.status <> 'active' then raise exception 'user_blocked' using errcode='42501'; end if;
    if new.id is distinct from old.id
       or new.email is distinct from old.email
       or new.role is distinct from old.role
       or new.status is distinct from old.status
       or new.rating is distinct from old.rating
       or new.completed_tasks_count is distinct from old.completed_tasks_count
       or new.onboarding_step is distinct from old.onboarding_step
       or new.onboarding_completed_at is distinct from old.onboarding_completed_at
       or new.email_verified is distinct from old.email_verified
       or new.phone_verified is distinct from old.phone_verified
       or new.identity_verified is distinct from old.identity_verified
       or new.community_verified is distinct from old.community_verified
       or new.trust_score is distinct from old.trust_score
       or new.trust_level is distinct from old.trust_level
       or new.trust_score_updated_at is distinct from old.trust_score_updated_at
       or new.reputation_points is distinct from old.reputation_points
       or new.reputation_level is distinct from old.reputation_level
       or new.consistency_streak is distinct from old.consistency_streak
       or new.community_contribution_count is distinct from old.community_contribution_count
       or new.deleted_at is distinct from old.deleted_at then
      raise exception 'protected_profile_fields_forbidden' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_profile_role on public.profiles;
drop trigger if exists protect_profile_system_fields on public.profiles;
create trigger protect_profile_system_fields before update on public.profiles for each row execute function public.protect_profile_system_fields();

create or replace function public.protect_volunteer_system_fields()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user not in ('postgres','service_role','supabase_admin') and not private.is_admin() then
    if new.user_id is distinct from old.user_id
       or new.verification_status is distinct from old.verification_status
       or new.bonus_balance is distinct from old.bonus_balance
       or new.level is distinct from old.level
       or new.reputation_points is distinct from old.reputation_points
       or new.reputation_level is distinct from old.reputation_level
       or new.positive_reviews_count is distinct from old.positive_reviews_count
       or new.successful_helps_count is distinct from old.successful_helps_count
       or new.last_active_at is distinct from old.last_active_at
       or new.verification_requested_at is distinct from old.verification_requested_at then
      raise exception 'protected_volunteer_fields_forbidden' using errcode='42501';
    end if;
  end if;
  return new;
end;
$$;
drop trigger if exists protect_volunteer_system_fields on public.volunteer_profiles;
create trigger protect_volunteer_system_fields before update on public.volunteer_profiles for each row execute function public.protect_volunteer_system_fields();

-- Column privileges are a second boundary in addition to RLS + triggers.
revoke update on table public.profiles from authenticated;
grant update(full_name,phone,avatar_url,city,district,city_id,district_id,preferred_language,share_community_activity,show_public_name,show_city,allow_public_profile,transactional_email_enabled,marketing_email_enabled) on public.profiles to authenticated;
revoke update on table public.volunteer_profiles from authenticated;
grant update(bio,skills,availability) on public.volunteer_profiles to authenticated;

revoke insert, update, delete on table public.help_requests from authenticated;
revoke insert, update, delete on table public.request_private_details from authenticated;
revoke insert, update, delete on table public.responses from authenticated;
revoke insert, update, delete on table public.assignments from authenticated;
revoke insert, update, delete on table public.reviews from anon, authenticated;
revoke insert, update, delete on table public.reports from authenticated;
revoke insert, update, delete on table public.bonus_transactions from authenticated;
revoke insert, update, delete on table public.reputation_ledger from authenticated;
revoke insert, update, delete on table public.community_events from authenticated;

-- Public reviews no longer expose internal participant identifiers.
drop policy if exists reviews_public_read on public.reviews;
create policy reviews_participant_read on public.reviews for select to authenticated using (
  author_id=auth.uid() or receiver_id=auth.uid() or private.is_admin()
);
revoke select on table public.reviews from anon, authenticated;
create or replace view public.public_reviews with (security_barrier=true) as
select r.id,r.assignment_id,r.rating,r.text,r.created_at,
  case when p.show_public_name and p.allow_public_profile then p.full_name else null end as reviewer_name,
  case when p.show_public_name and p.allow_public_profile then p.avatar_url else null end as reviewer_avatar_url
from public.reviews r
join public.profiles p on p.id=r.author_id
where p.status='active' and p.deleted_at is null;
grant select on public.public_reviews to anon, authenticated;
grant select on public.reviews to authenticated;

create or replace function public.get_public_profile_reviews(p_profile_id uuid)
returns table(id uuid,rating integer,text text,created_at timestamptz,reviewer_name text,reviewer_avatar_url text,context_category_ru text,context_category_kk text)
language sql
stable
security definer
set search_path=public
as $$
  select rv.id,rv.rating,rv.text,rv.created_at,
    case when reviewer.show_public_name and reviewer.allow_public_profile then reviewer.full_name else null end,
    case when reviewer.show_public_name and reviewer.allow_public_profile then reviewer.avatar_url else null end,
    c.name_ru,c.name_kk
  from public.reviews rv
  join public.profiles receiver on receiver.id=rv.receiver_id
  join public.profiles reviewer on reviewer.id=rv.author_id
  join public.assignments a on a.id=rv.assignment_id
  join public.help_requests r on r.id=a.request_id
  join public.categories c on c.id=r.category_id
  where rv.receiver_id=p_profile_id and receiver.status='active' and receiver.deleted_at is null and receiver.allow_public_profile=true
  order by rv.created_at desc
  limit 100;
$$;

-- Community privacy: hidden identity means hidden avatar and city too.
create or replace view public.public_community_events with (security_barrier=true) as
select e.id,e.event_type,
  case when e.is_anonymous or not coalesce(p.show_public_name,false) then null else p.full_name end as actor_name,
  case when e.is_anonymous or not coalesce(p.show_public_name,false) then null else p.avatar_url end as actor_avatar_url,
  case when e.is_anonymous or not coalesce(p.show_city,false) then null else e.city end as city,
  e.category_slug,
  case when e.is_anonymous then e.payload - 'profile_url' - 'avatar_url' - 'city' else e.payload - 'profile_url' end as payload,
  e.occurred_at
from public.community_events e
left join public.profiles p on p.id=e.actor_id
where e.is_published=true and (e.actor_id is null or (p.status='active' and p.deleted_at is null and p.share_community_activity=true));

grant select on public.public_community_events to anon, authenticated;

-- Open catalogue: only requests that currently accept responses.
-- Public browsing is view-only: authenticated users may read base requests only through author/admin RLS.
drop policy if exists requests_public_read on public.help_requests;
revoke select on public.help_requests from anon;
grant select on public.help_requests to authenticated;

create or replace view public.public_help_requests with (security_barrier=true) as
select r.id,r.title,r.description,r.content_language,r.category_id,
  c.slug as category_slug,c.name_ru as category_name_ru,c.name_kk as category_name_kk,
  r.city,r.district,r.desired_date,r.time_from,r.time_to,r.urgency,r.help_format,r.status,
  r.image_url,r.special_conditions,r.created_at,
  (select count(*)::integer from public.responses x where x.request_id=r.id and x.status='pending') as response_count,
  case when p.show_public_name then p.full_name else concat(left(p.full_name,1),'.') end as author_name,
  p.rating as author_rating,
  case when p.show_public_name then p.avatar_url else null end as author_avatar_url,
  (auth.uid() is not null and auth.uid()=r.author_id) as viewer_is_author,
  r.reward_type,r.reward_note,r.reward_points,r.city_id,r.district_id
from public.help_requests r
join public.categories c on c.id=r.category_id
join public.profiles p on p.id=r.author_id
where r.status='open' and p.status='active' and p.deleted_at is null;
grant select on public.public_help_requests to anon, authenticated;

create or replace view public.public_profiles with (security_barrier=true) as
select p.id,
  case when p.show_public_name then p.full_name else concat(left(p.full_name,1),'.') end as full_name,
  case when p.show_public_name then p.avatar_url else null end as avatar_url,
  p.role,p.can_volunteer,
  case when p.show_city then coalesce(c.name_ru,p.city) else null end as city,
  case when p.show_city then coalesce(d.name_ru,p.district) else null end as district,
  case when p.show_city then p.city_id else null end as city_id,
  case when p.show_city then p.district_id else null end as district_id,
  case when p.show_city then c.name_ru else null end as city_name_ru,
  case when p.show_city then c.name_kk else null end as city_name_kk,
  case when p.show_city then d.name_ru else null end as district_name_ru,
  case when p.show_city then d.name_kk else null end as district_name_kk,
  p.rating,p.completed_tasks_count,p.trust_score,p.trust_level,p.reputation_points,p.reputation_level,
  p.community_verified,p.created_at,p.email_verified,p.phone_verified,p.identity_verified
from public.profiles p
left join public.cities c on c.id=p.city_id
left join public.districts d on d.id=p.district_id
where p.status='active' and p.deleted_at is null and p.allow_public_profile=true and p.role is not null;
grant select on public.public_profiles to anon,authenticated;

create or replace view public.participant_profiles with (security_barrier=true) as
select p.id,p.full_name,p.avatar_url,p.rating,p.completed_tasks_count,p.trust_score,p.trust_level,
  p.reputation_points,p.reputation_level,p.community_verified,p.email_verified,p.phone_verified,p.identity_verified,
  vp.verification_status,vp.positive_reviews_count,vp.successful_helps_count
from public.profiles p
left join public.volunteer_profiles vp on vp.user_id=p.id
where p.status='active' and p.deleted_at is null;
revoke all on public.participant_profiles from anon, authenticated;

create or replace function public.get_participant_profile(p_user_id uuid,p_request_id uuid)
returns table(
  id uuid, full_name text, avatar_url text, rating numeric, completed_tasks_count integer,
  trust_score smallint, trust_level text, reputation_points integer, reputation_level text,
  community_verified boolean, email_verified boolean, phone_verified boolean, identity_verified boolean,
  verification_status public.verification_status, positive_reviews_count integer, successful_helps_count integer
)
language sql
stable
security definer
set search_path=public,private
as $$
  select pp.id,pp.full_name,pp.avatar_url,pp.rating,pp.completed_tasks_count,pp.trust_score,pp.trust_level,
         pp.reputation_points,pp.reputation_level,pp.community_verified,pp.email_verified,pp.phone_verified,pp.identity_verified,
         pp.verification_status,pp.positive_reviews_count,pp.successful_helps_count
  from public.participant_profiles pp
  where pp.id=p_user_id and (
    private.is_admin()
    or exists(select 1 from public.help_requests r where r.id=p_request_id and r.author_id=auth.uid() and (
      p_user_id=r.selected_volunteer_id or exists(select 1 from public.responses x where x.request_id=r.id and x.volunteer_id=p_user_id)
    ))
    or exists(select 1 from public.help_requests r where r.id=p_request_id and r.author_id=p_user_id and r.selected_volunteer_id=auth.uid())
  );
$$;

create or replace function public.get_response_participant_profiles()
returns table(
  response_id uuid, request_id uuid, volunteer_id uuid, full_name text, avatar_url text,
  rating numeric, trust_score smallint, trust_level text, reputation_points integer,
  reputation_level text, verification_status public.verification_status,
  positive_reviews_count integer, successful_helps_count integer
)
language sql
stable
security definer
set search_path=public,private
as $$
  select x.id,x.request_id,x.volunteer_id,pp.full_name,pp.avatar_url,pp.rating,pp.trust_score,pp.trust_level,
         pp.reputation_points,pp.reputation_level,pp.verification_status,pp.positive_reviews_count,pp.successful_helps_count
  from public.responses x
  join public.help_requests r on r.id=x.request_id
  join public.participant_profiles pp on pp.id=x.volunteer_id
  where r.author_id=auth.uid() or private.is_admin()
  order by x.created_at desc
  limit 200;
$$;

create or replace function public.get_my_assignments()
returns table(
  id uuid, request_id uuid, volunteer_id uuid, status public.assignment_status,
  started_at timestamptz, volunteer_completed_at timestamptz, requester_confirmed_at timestamptz,
  help_minutes integer, cancelled_at timestamptz, cancellation_reason text, created_at timestamptz,
  request_title text, request_status public.request_status, requester_id uuid
)
language sql
stable
security definer
set search_path=public,private
as $$
  select a.id,a.request_id,a.volunteer_id,a.status,a.started_at,a.volunteer_completed_at,a.requester_confirmed_at,
         a.help_minutes,a.cancelled_at,a.cancellation_reason,a.created_at,r.title,r.status,r.author_id
  from public.assignments a join public.help_requests r on r.id=a.request_id
  where auth.uid() is not null and (a.volunteer_id=auth.uid() or r.author_id=auth.uid() or private.is_admin())
  order by a.created_at desc
  limit 100;
$$;

create or replace function public.get_assignment_context(p_assignment_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests; d public.request_private_details; requester public.profiles; volunteer public.profiles; category public.categories;
begin
  select * into a from public.assignments where id=p_assignment_id;
  if a.id is null then raise exception 'assignment_not_found' using errcode='P0002'; end if;
  select * into r from public.help_requests where id=a.request_id;
  if auth.uid() not in (r.author_id,a.volunteer_id) and not private.is_admin() then raise exception 'assignment_forbidden' using errcode='42501'; end if;
  select * into d from public.request_private_details where request_id=r.id;
  select * into requester from public.profiles where id=r.author_id;
  select * into volunteer from public.profiles where id=a.volunteer_id;
  select * into category from public.categories where id=r.category_id;
  return jsonb_build_object(
    'assignment',jsonb_build_object('id',a.id,'status',a.status,'started_at',a.started_at,'volunteer_completed_at',a.volunteer_completed_at,'requester_confirmed_at',a.requester_confirmed_at,'help_minutes',a.help_minutes,'cancelled_at',a.cancelled_at,'cancellation_reason',a.cancellation_reason),
    'request',jsonb_build_object('id',r.id,'title',r.title,'description',r.description,'category_id',r.category_id,'category_slug',category.slug,'category_name_ru',category.name_ru,'category_name_kk',category.name_kk,'urgency',r.urgency,'desired_date',r.desired_date,'time_from',r.time_from,'time_to',r.time_to,'city',r.city,'district',r.district,'image_url',r.image_url,'reward_type',r.reward_type,'reward_note',r.reward_note),
    'private_details',case when a.status <> 'cancelled' and r.selected_volunteer_id=a.volunteer_id then jsonb_build_object('address',d.address,'landmark',d.location_notes,'contact_method',d.preferred_contact_method,'contact_value',coalesce(d.contact_value,requester.phone),'volunteer_instructions',d.volunteer_instructions,'requester_phone',requester.phone) else null end,
    'requester',jsonb_build_object('id',requester.id,'name',requester.full_name,'avatar_url',requester.avatar_url,'rating',requester.rating,'trust_score',requester.trust_score,'trust_level',requester.trust_level),
    'volunteer',jsonb_build_object('id',volunteer.id,'name',volunteer.full_name,'avatar_url',volunteer.avatar_url,'rating',volunteer.rating,'trust_score',volunteer.trust_score,'trust_level',volunteer.trust_level)
  );
end;
$$;

create or replace function public.create_response(p_request_id uuid,p_message text)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare p public.profiles; r public.help_requests; response_id uuid;
begin
  p:=private.require_active_user();
  perform private.enforce_rate_limit('response_create',30,interval '1 hour');
  if not p.can_volunteer and p.role<>'admin' then raise exception 'volunteer_capability_required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_message,''))) not between 10 and 1000 then raise exception 'invalid_response_message' using errcode='22023'; end if;
  select * into r from public.help_requests where id=p_request_id for update;
  if r.id is null or r.status<>'open' or r.author_id=auth.uid() then raise exception 'request_not_accepting_responses' using errcode='42501'; end if;
  if exists(select 1 from public.responses where request_id=p_request_id and volunteer_id=auth.uid() and status in ('pending','accepted')) then raise exception 'response_already_exists' using errcode='23505'; end if;
  insert into public.volunteer_profiles(user_id) values(auth.uid()) on conflict(user_id) do nothing;
  insert into public.responses(request_id,volunteer_id,message,status)
  values(p_request_id,auth.uid(),trim(p_message),'pending') returning id into response_id;
  update public.profiles set can_volunteer=true,last_active_at=now() where id=auth.uid();
  update public.volunteer_profiles set last_active_at=now() where user_id=auth.uid();
  perform private.track_product_event('response_created',null,r.id,null,p.preferred_language::text,'{}'::jsonb);
  perform private.enqueue_notification(r.author_id,'new_response','notifications.newResponse',null,'/dashboard',auth.uid(),jsonb_build_object('request_id',r.id,'response_id',response_id),false);
  return response_id;
end;
$$;

create or replace function public.withdraw_response(p_response_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare x public.responses; r public.help_requests;
begin
  perform private.require_active_user();
  select * into x from public.responses where id=p_response_id for update;
  if x.id is null or x.volunteer_id<>auth.uid() or x.status<>'pending' then raise exception 'response_not_withdrawable' using errcode='42501'; end if;
  update public.responses set status='withdrawn' where id=x.id;
  select * into r from public.help_requests where id=x.request_id;
  perform private.track_product_event('response_withdrawn',null,r.id,null,null,'{}'::jsonb);
  perform private.enqueue_notification(r.author_id,'response_withdrawn','notifications.responseWithdrawn',null,'/dashboard',auth.uid(),jsonb_build_object('request_id',r.id,'response_id',x.id),false);
end;
$$;

create or replace function public.select_volunteer(p_request_id uuid,p_response_id uuid)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare r public.help_requests; x public.responses; assignment_id uuid; previous_volunteer uuid;
begin
  perform private.require_active_user();
  select * into r from public.help_requests where id=p_request_id for update;
  if r.id is null or r.author_id<>auth.uid() or r.status<>'open' then raise exception 'request_not_selectable' using errcode='42501'; end if;
  select * into x from public.responses where id=p_response_id and request_id=p_request_id and status='pending' for update;
  if x.id is null then raise exception 'response_not_found' using errcode='P0002'; end if;
  if exists(select 1 from public.assignments where request_id=p_request_id and status in ('volunteer_selected','in_progress','awaiting_confirmation','disputed')) then raise exception 'active_assignment_exists' using errcode='23505'; end if;
  select volunteer_id into previous_volunteer from public.assignments where request_id=p_request_id and status='cancelled' and volunteer_id<>x.volunteer_id order by cancelled_at desc nulls last,created_at desc limit 1;
  update public.responses set status=case when id=x.id then 'accepted'::public.response_status else 'rejected'::public.response_status end where request_id=p_request_id and status='pending';
  insert into public.assignments(request_id,volunteer_id,status) values(p_request_id,x.volunteer_id,'volunteer_selected') returning id into assignment_id;
  update public.help_requests set selected_volunteer_id=x.volunteer_id,status='volunteer_selected' where id=p_request_id;
  perform private.track_product_event('volunteer_selected',null,r.id,assignment_id,null,'{}'::jsonb);
  perform private.enqueue_notification(x.volunteer_id,'volunteer_selected','notifications.selected',null,'/assignments/'||assignment_id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',assignment_id),true);
  if previous_volunteer is not null then
    perform private.enqueue_notification(previous_volunteer,'volunteer_reassigned','notifications.reassigned',null,'/dashboard',auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',assignment_id),false);
  end if;
  return assignment_id;
end;
$$;

create or replace function public.start_assignment(p_assignment_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests;
begin
  perform private.require_active_user();
  select * into a from public.assignments where id=p_assignment_id for update;
  if a.id is null or a.volunteer_id<>auth.uid() or a.status<>'volunteer_selected' then raise exception 'transition_forbidden' using errcode='42501'; end if;
  update public.assignments set status='in_progress',started_at=coalesce(started_at,now()) where id=a.id;
  update public.help_requests set status='in_progress' where id=a.request_id returning * into r;
  update public.volunteer_profiles set last_active_at=now() where user_id=auth.uid();
  update public.profiles set last_active_at=now() where id=auth.uid();
  perform private.track_product_event('assignment_started',null,r.id,a.id,null,'{}'::jsonb);
  perform private.enqueue_notification(r.author_id,'assignment_started','notifications.started',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id),false);
end;
$$;

create or replace function public.mark_assignment_done(p_assignment_id uuid,p_help_minutes integer default null)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests; minutes integer;
begin
  perform private.require_active_user();
  select * into a from public.assignments where id=p_assignment_id for update;
  if a.id is null or a.volunteer_id<>auth.uid() or a.status<>'in_progress' then raise exception 'transition_forbidden' using errcode='42501'; end if;
  if p_help_minutes is null or p_help_minutes<5 or p_help_minutes>1440 then raise exception 'invalid_help_minutes' using errcode='22023'; end if;
  minutes:=p_help_minutes;
  update public.assignments set status='awaiting_confirmation',volunteer_completed_at=coalesce(volunteer_completed_at,now()),help_minutes=minutes where id=a.id;
  update public.help_requests set status='awaiting_confirmation' where id=a.request_id returning * into r;
  perform private.track_product_event('assignment_completed',null,r.id,a.id,null,jsonb_build_object('help_minutes',minutes));
  perform private.enqueue_notification(r.author_id,'assignment_completed','notifications.awaitingConfirmation',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id),true);
end;
$$;

create or replace function public.confirm_assignment_completion(p_assignment_id uuid)
returns integer
language plpgsql
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests;
begin
  perform private.require_active_user();
  select * into a from public.assignments where id=p_assignment_id for update;
  if a.id is null or a.status<>'awaiting_confirmation' then raise exception 'assignment_not_confirmable' using errcode='42501'; end if;
  select * into r from public.help_requests where id=a.request_id for update;
  if r.author_id<>auth.uid() and not private.is_admin() then raise exception 'confirmation_forbidden' using errcode='42501'; end if;
  update public.assignments set status='completed',requester_confirmed_at=coalesce(requester_confirmed_at,now()) where id=a.id;
  update public.help_requests set status='completed' where id=r.id;
  perform private.track_product_event('completion_confirmed',null,r.id,a.id,null,'{}'::jsonb);
  perform private.enqueue_notification(a.volunteer_id,'completion_confirmed','notifications.confirmed',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id),true);
  perform private.enqueue_notification(a.volunteer_id,'reputation_earned','notifications.rewardEarned',null,'/profile/'||a.volunteer_id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id,'points',100),false);
  return 100;
end;
$$;

create or replace function public.cancel_assignment(p_assignment_id uuid,p_reason text)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests;
begin
  perform private.require_active_user();
  if char_length(trim(coalesce(p_reason,''))) not between 3 and 500 then raise exception 'cancellation_reason_required' using errcode='22023'; end if;
  select * into a from public.assignments where id=p_assignment_id for update;
  if a.id is null or a.volunteer_id<>auth.uid() or a.status not in ('volunteer_selected','in_progress') then raise exception 'assignment_not_cancellable' using errcode='42501'; end if;
  update public.assignments set status='cancelled',cancelled_by=auth.uid(),cancellation_reason=trim(p_reason),cancelled_at=now() where id=a.id;
  update public.help_requests set status='open',selected_volunteer_id=null where id=a.request_id returning * into r;
  update public.responses set status='withdrawn' where request_id=a.request_id and volunteer_id=a.volunteer_id and status='accepted';
  update public.responses set status='pending' where request_id=a.request_id and volunteer_id<>a.volunteer_id and status='rejected';
  perform private.enqueue_notification(r.author_id,'assignment_cancelled','notifications.assignmentCancelled',null,'/requests/'||r.id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id,'reason',trim(p_reason)),true);
end;
$$;

create or replace function public.cancel_request(p_request_id uuid,p_reason text default null)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare r public.help_requests; a public.assignments;
begin
  perform private.require_active_user();
  select * into r from public.help_requests where id=p_request_id for update;
  if r.id is null or (r.author_id<>auth.uid() and not private.is_admin()) or r.status in ('completed','cancelled') then raise exception 'request_not_cancellable' using errcode='42501'; end if;
  select * into a from public.assignments where request_id=r.id and status in ('volunteer_selected','in_progress','awaiting_confirmation','disputed') order by created_at desc limit 1 for update;
  if a.id is not null then
    update public.assignments set status='cancelled',cancelled_by=auth.uid(),cancellation_reason=coalesce(nullif(trim(p_reason),''),'request_cancelled'),cancelled_at=now() where id=a.id;
    perform private.enqueue_notification(a.volunteer_id,'request_cancelled','notifications.requestCancelled',null,'/dashboard',auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id),true);
  end if;
  update public.responses set status='rejected' where request_id=r.id and status='pending';
  update public.help_requests set status='cancelled',selected_volunteer_id=null where id=r.id;
end;
$$;

create or replace function public.reopen_request(p_request_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare r public.help_requests;
begin
  perform private.require_active_user();
  select * into r from public.help_requests where id=p_request_id for update;
  if r.id is null or r.author_id<>auth.uid() or r.status<>'cancelled' then raise exception 'request_not_reopenable' using errcode='42501'; end if;
  update public.help_requests set status='open',selected_volunteer_id=null where id=r.id;
  update public.responses set status='pending' where request_id=r.id and status='rejected';
end;
$$;

create or replace function public.open_dispute(p_assignment_id uuid,p_reason text,p_description text default null)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests; dispute_id uuid; other_user uuid;
begin
  perform private.enforce_rate_limit('dispute_create',5,interval '1 hour');
  perform private.require_active_user();
  if p_reason not in ('no_show','help_not_provided','requester_unresponsive','false_completion','inappropriate_behaviour','unsafe_behaviour','fraud_scam','other') then raise exception 'invalid_dispute_reason' using errcode='22023'; end if;
  select * into a from public.assignments where id=p_assignment_id for update;
  if a.id is null then raise exception 'assignment_not_found' using errcode='P0002'; end if;
  select * into r from public.help_requests where id=a.request_id for update;
  if auth.uid() not in (r.author_id,a.volunteer_id) then raise exception 'dispute_forbidden' using errcode='42501'; end if;
  if a.status not in ('volunteer_selected','in_progress','awaiting_confirmation') then raise exception 'assignment_not_disputable' using errcode='42501'; end if;
  insert into public.disputes(request_id,assignment_id,opened_by,reason,description)
  values(r.id,a.id,auth.uid(),p_reason,nullif(trim(p_description),'')) returning id into dispute_id;
  update public.assignments set status='disputed' where id=a.id;
  update public.help_requests set status='disputed' where id=r.id;
  other_user:=case when auth.uid()=r.author_id then a.volunteer_id else r.author_id end;
  perform private.enqueue_notification(other_user,'dispute_opened','notifications.disputeOpened',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id,'dispute_id',dispute_id),true);
  if auth.uid()=r.author_id and a.status='awaiting_confirmation' then
    perform private.enqueue_notification(a.volunteer_id,'completion_rejected','notifications.completionRejected',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('request_id',r.id,'assignment_id',a.id,'dispute_id',dispute_id),true);
  end if;
  return dispute_id;
end;
$$;

create or replace function public.create_report(p_target_type text,p_target_id uuid,p_reason text,p_description text default null)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare report_id uuid;
begin
  perform private.enforce_rate_limit('report_create',10,interval '1 hour');
  perform private.require_active_user();
  if p_target_type not in ('profile','request','response','assignment') or char_length(trim(coalesce(p_reason,''))) not between 3 and 160 then raise exception 'invalid_report' using errcode='22023'; end if;
  if p_target_type='profile' then
    if p_target_id=auth.uid() or not exists(select 1 from public.profiles where id=p_target_id and deleted_at is null) then raise exception 'report_target_not_found' using errcode='P0002'; end if;
  elsif p_target_type='request' then
    if not exists(select 1 from public.help_requests r where r.id=p_target_id and (r.status='open' or r.author_id=auth.uid() or r.selected_volunteer_id=auth.uid())) then raise exception 'report_target_not_found' using errcode='P0002'; end if;
  elsif p_target_type='response' then
    if not exists(select 1 from public.responses x join public.help_requests r on r.id=x.request_id where x.id=p_target_id and (x.volunteer_id=auth.uid() or r.author_id=auth.uid())) then raise exception 'report_target_not_found' using errcode='P0002'; end if;
  elsif p_target_type='assignment' then
    if not exists(select 1 from public.assignments a join public.help_requests r on r.id=a.request_id where a.id=p_target_id and (a.volunteer_id=auth.uid() or r.author_id=auth.uid())) then raise exception 'report_target_not_found' using errcode='P0002'; end if;
  end if;
  insert into public.reports(author_id,target_type,target_id,reason,description)
  values(auth.uid(),p_target_type::public.report_target_type,p_target_id,trim(p_reason),nullif(trim(p_description),'')) returning id into report_id;
  return report_id;
end;
$$;

create or replace function public.submit_review(p_assignment_id uuid,p_rating integer,p_text text default null)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare a public.assignments; r public.help_requests; receiver uuid; review_id uuid;
begin
  perform private.require_active_user();
  if p_rating not between 1 and 5 then raise exception 'invalid_rating' using errcode='22023'; end if;
  select * into a from public.assignments where id=p_assignment_id;
  if a.id is null or a.status<>'completed' then raise exception 'assignment_not_completed' using errcode='42501'; end if;
  select * into r from public.help_requests where id=a.request_id;
  if auth.uid()=r.author_id then receiver:=a.volunteer_id;
  elsif auth.uid()=a.volunteer_id then receiver:=r.author_id;
  else raise exception 'review_forbidden' using errcode='42501'; end if;
  insert into public.reviews(assignment_id,author_id,receiver_id,rating,text)
  values(a.id,auth.uid(),receiver,p_rating,nullif(trim(p_text),'')) returning id into review_id;
  update public.profiles p set rating=coalesce((select round(avg(x.rating)::numeric,2) from public.reviews x where x.receiver_id=p.id),0) where p.id=receiver;
  perform private.track_product_event('reviewed',null,r.id,a.id,null,jsonb_build_object('rating',p_rating));
  perform private.enqueue_notification(receiver,'new_review','notifications.newReview',null,'/profile/'||receiver::text,auth.uid(),jsonb_build_object('assignment_id',a.id,'review_id',review_id),false);
  return review_id;
end;
$$;

create or replace function public.handle_completed_help()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare r public.help_requests; p public.profiles; completed_count integer; streak integer;
begin
  if new.status='completed' and old.status is distinct from 'completed' then
    select * into r from public.help_requests where id=new.request_id;
    select * into p from public.profiles where id=new.volunteer_id;
    select count(*)::integer into completed_count from public.assignments where volunteer_id=new.volunteer_id and status='completed';
    with weeks as (
      select distinct date_trunc('week',coalesce(requester_confirmed_at,updated_at))::date as wk
      from public.assignments where volunteer_id=new.volunteer_id and status='completed'
    ), ranked as (
      select wk,row_number() over(order by wk desc) rn,max(wk) over() max_wk from weeks
    )
    select coalesce(count(*) filter(where wk=max_wk-((rn-1)::integer*7)),0)::integer into streak from ranked
    where max_wk >= date_trunc('week',now())::date - 7;
    update public.profiles set completed_tasks_count=completed_count,community_contribution_count=completed_count,consistency_streak=coalesce(streak,0),last_active_at=now() where id=new.volunteer_id;
    update public.volunteer_profiles set successful_helps_count=completed_count,last_active_at=now() where user_id=new.volunteer_id;
    insert into public.reputation_ledger(user_id,points,reason,source_type,source_id)
      values(new.volunteer_id,100,'completed_help','assignment',new.id) on conflict do nothing;
    if p.share_community_activity then
      insert into public.community_events(event_type,actor_id,target_type,target_id,city,category_slug,is_anonymous,payload)
      select 'help_completed',new.volunteer_id,'assignment',new.id,r.city,c.slug,not p.show_public_name,jsonb_build_object('help_minutes',new.help_minutes)
      from public.categories c where c.id=r.category_id on conflict do nothing;
    end if;
    perform public.recalculate_reputation(new.volunteer_id);
    perform public.refresh_achievement_progress(new.volunteer_id);
    perform public.recalculate_trust_score(new.volunteer_id);
    perform public.recalculate_trust_score(r.author_id);
  end if;
  return new;
end;
$$;

create or replace function public.handle_positive_review_reputation()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
begin
  if new.rating>=4 then
    insert into public.reputation_ledger(user_id,points,reason,source_type,source_id)
    values(new.receiver_id,20,'positive_review','review',new.id) on conflict do nothing;
  end if;
  update public.volunteer_profiles vp set positive_reviews_count=(select count(*) from public.reviews r where r.receiver_id=vp.user_id and r.rating>=4) where vp.user_id=new.receiver_id;
  perform public.recalculate_reputation(new.receiver_id);
  perform public.recalculate_trust_score(new.receiver_id);
  return new;
end;
$$;

create or replace function private.sync_verification_status(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare overall public.verification_status;
begin
  if exists(select 1 from public.profiles where id=p_user_id and (identity_verified or community_verified)) then overall:='verified';
  elsif exists(select 1 from public.verification_requests where user_id=p_user_id and status='pending') then overall:='pending';
  elsif exists(select 1 from public.verification_requests where user_id=p_user_id and status='rejected') then overall:='rejected';
  else overall:='unverified'; end if;
  insert into public.volunteer_profiles(user_id,verification_status,verification_requested_at)
  values(p_user_id,overall,case when overall='pending' then now() else null end)
  on conflict(user_id) do update set verification_status=excluded.verification_status,verification_requested_at=case when excluded.verification_status='pending' then coalesce(public.volunteer_profiles.verification_requested_at,now()) else public.volunteer_profiles.verification_requested_at end;
end;
$$;

create or replace function public.request_verification(p_kind text,p_note text default null)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare id_out uuid;
begin
  perform private.enforce_rate_limit('verification',3,interval '1 day');
  perform private.require_active_user();
  if p_kind not in ('identity','community') then raise exception 'invalid_verification_kind' using errcode='22023'; end if;
  insert into public.verification_requests(user_id,kind,note) values(auth.uid(),p_kind,nullif(trim(p_note),'')) returning id into id_out;
  perform private.sync_verification_status(auth.uid());
  return id_out;
end;
$$;

create or replace function public.admin_resolve_verification(p_request_id uuid,p_approve boolean,p_reason text)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare v public.verification_requests; old_status public.verification_status;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required' using errcode='22023'; end if;
  select * into v from public.verification_requests where id=p_request_id and status='pending' for update;
  if v.id is null then raise exception 'verification_request_not_found' using errcode='P0002'; end if;
  select verification_status into old_status from public.volunteer_profiles where user_id=v.user_id;
  update public.verification_requests set status=case when p_approve then 'verified' else 'rejected' end,reviewed_by=auth.uid(),review_reason=trim(p_reason),reviewed_at=now() where id=v.id;
  update public.volunteer_profiles set verification_status=case when p_approve then 'verified' else 'rejected' end where user_id=v.user_id;
  if v.kind='identity' then update public.profiles set identity_verified=p_approve where id=v.user_id;
  else update public.profiles set community_verified=p_approve where id=v.user_id; end if;
  perform private.sync_verification_status(v.user_id);
  insert into public.moderation_actions(admin_id,target_user_id,target_type,target_id,action_type,reason,previous_value,new_value)
  values(auth.uid(),v.user_id,'verification_request',v.id,'verification_resolution',trim(p_reason),jsonb_build_object('status',old_status),jsonb_build_object('status',case when p_approve then 'verified' else 'rejected' end));
  perform private.enqueue_notification(v.user_id,'verification_update','notifications.verificationUpdate',null,'/dashboard',auth.uid(),jsonb_build_object('kind',v.kind,'approved',p_approve),true);
end;
$$;

create or replace function public.admin_set_user_blocked(p_user_id uuid,p_blocked boolean,p_reason text)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare old_status public.user_status; new_status public.user_status;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_user_id=auth.uid() then raise exception 'cannot_block_self' using errcode='22023'; end if;
  if char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required' using errcode='22023'; end if;
  select status into old_status from public.profiles where id=p_user_id for update;
  if old_status is null then raise exception 'profile_not_found' using errcode='P0002'; end if;
  new_status:=case when p_blocked then 'blocked'::public.user_status else 'active'::public.user_status end;
  update public.profiles set status=new_status where id=p_user_id;
  insert into public.moderation_actions(admin_id,target_user_id,target_type,target_id,action_type,reason,previous_value,new_value)
  values(auth.uid(),p_user_id,'profile',p_user_id,case when p_blocked then 'block_user' else 'unblock_user' end,trim(p_reason),jsonb_build_object('status',old_status),jsonb_build_object('status',new_status));
  perform private.enqueue_notification(p_user_id,'admin_action','notifications.adminAction',null,'/dashboard',auth.uid(),jsonb_build_object('blocked',p_blocked,'reason',trim(p_reason)),true);
end;
$$;

create or replace function public.admin_list_users(
  p_search text default null,
  p_role text default null,
  p_status text default null,
  p_verification text default null,
  p_min_trust integer default null,
  p_offset integer default 0,
  p_limit integer default 25
)
returns table(
  id uuid,full_name text,email text,role public.user_role,status public.user_status,
  verification_status public.verification_status,trust_score integer,created_at timestamptz,
  completed_tasks_count integer,reports_count bigint,total_count bigint
)
language sql
stable
security definer
set search_path=public,private
as $$
  select p.id,p.full_name,p.email,p.role,p.status,coalesce(vp.verification_status,'unverified'::public.verification_status),p.trust_score,p.created_at,p.completed_tasks_count,
    (select count(*) from public.reports rr where rr.target_type='profile' and rr.target_id=p.id),count(*) over()
  from public.profiles p
  left join public.volunteer_profiles vp on vp.user_id=p.id
  where private.is_admin()
    and (nullif(trim(p_search),'') is null or p.full_name ilike '%'||trim(p_search)||'%' or coalesce(p.email,'') ilike '%'||trim(p_search)||'%')
    and (p_role is null or p_role='' or p.role::text=p_role)
    and (p_status is null or p_status='' or p.status::text=p_status)
    and (p_verification is null or p_verification='' or coalesce(vp.verification_status,'unverified'::public.verification_status)::text=p_verification)
    and (p_min_trust is null or p.trust_score>=p_min_trust)
  order by p.created_at desc
  offset greatest(p_offset,0) limit greatest(1,least(p_limit,100));
$$;

create or replace function public.admin_remove_request_image(p_request_id uuid,p_reason text)
returns text
language plpgsql
security definer
set search_path=public,private
as $$
declare old_url text;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required' using errcode='22023'; end if;
  select image_url into old_url from public.help_requests where id=p_request_id for update;
  if not found then raise exception 'request_not_found' using errcode='P0002'; end if;
  update public.help_requests set image_url=null,updated_at=now() where id=p_request_id;
  insert into public.moderation_actions(admin_id,target_type,target_id,action_type,reason,new_value)
  values(auth.uid(),'request',p_request_id,'remove_request_image',trim(p_reason),jsonb_build_object('image_url',null));
  return old_url;
end;
$$;

create or replace function public.admin_resolve_report(p_report_id uuid,p_status text,p_reason text)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare r public.reports; old_status text;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_status not in ('reviewing','resolved','dismissed') or char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'reason_required' using errcode='22023'; end if;
  select * into r from public.reports where id=p_report_id for update;
  if r.id is null then raise exception 'report_not_found' using errcode='P0002'; end if;
  old_status:=r.status::text;
  update public.reports set status=p_status::public.report_status,reviewed_by=auth.uid(),resolution_note=trim(p_reason),resolved_at=case when p_status in ('resolved','dismissed') then now() else null end where id=r.id;
  insert into public.moderation_actions(admin_id,target_user_id,target_type,target_id,action_type,reason,previous_value,new_value)
  values(auth.uid(),r.author_id,'report',r.id,'resolve_report',trim(p_reason),jsonb_build_object('status',old_status),jsonb_build_object('status',p_status,'target_type',r.target_type,'target_id',r.target_id));
  perform private.enqueue_notification(r.author_id,'report_update','notifications.reportUpdate',null,'/dashboard',auth.uid(),jsonb_build_object('report_id',r.id,'status',p_status),true);
end;
$$;

create or replace function public.admin_resolve_dispute(p_dispute_id uuid,p_action text,p_reason text)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare d public.disputes; a public.assignments; r public.help_requests; old_state text;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  if p_action not in ('resume','complete','cancel','reopen_request','dismiss') or char_length(trim(coalesce(p_reason,'')))<5 then raise exception 'invalid_resolution' using errcode='22023'; end if;
  select * into d from public.disputes where id=p_dispute_id and status in ('open','reviewing') for update;
  if d.id is null then raise exception 'dispute_not_found' using errcode='P0002'; end if;
  select * into a from public.assignments where id=d.assignment_id for update;
  select * into r from public.help_requests where id=d.request_id for update;
  old_state:=a.status::text||'/'||r.status::text;
  if p_action='resume' then
    update public.assignments set status=case when a.started_at is null then 'volunteer_selected' else 'in_progress' end where id=a.id;
    update public.help_requests set status=case when a.started_at is null then 'volunteer_selected' else 'in_progress' end where id=r.id;
  elsif p_action='complete' then
    update public.assignments set status='completed',requester_confirmed_at=coalesce(requester_confirmed_at,now()) where id=a.id;
    update public.help_requests set status='completed' where id=r.id;
  elsif p_action='cancel' then
    update public.assignments set status='cancelled',cancelled_by=auth.uid(),cancellation_reason=trim(p_reason),cancelled_at=now() where id=a.id;
    update public.help_requests set status='cancelled',selected_volunteer_id=null where id=r.id;
  elsif p_action='reopen_request' then
    update public.assignments set status='cancelled',cancelled_by=auth.uid(),cancellation_reason=trim(p_reason),cancelled_at=now() where id=a.id;
    update public.help_requests set status='open',selected_volunteer_id=null where id=r.id;
    update public.responses set status='pending' where request_id=r.id and status='rejected';
  end if;
  update public.disputes set status=case when p_action='dismiss' then 'dismissed' else 'resolved' end,resolution_action=p_action,resolution_note=trim(p_reason),resolved_by=auth.uid(),resolved_at=now() where id=d.id;
  insert into public.moderation_actions(admin_id,target_user_id,target_type,target_id,action_type,reason,previous_value,new_value)
  values(auth.uid(),d.opened_by,'dispute',d.id,'resolve_dispute',trim(p_reason),jsonb_build_object('state',old_state),jsonb_build_object('action',p_action));
  perform private.enqueue_notification(r.author_id,'dispute_update','notifications.disputeUpdate',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('dispute_id',d.id,'action',p_action),true);
  perform private.enqueue_notification(a.volunteer_id,'dispute_update','notifications.disputeUpdate',null,'/assignments/'||a.id::text,auth.uid(),jsonb_build_object('dispute_id',d.id,'action',p_action),true);
end;
$$;

create or replace function public.record_consent(p_document_type text,p_version text,p_request_id uuid default null,p_metadata jsonb default '{}'::jsonb)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare out_id uuid;
begin
  perform private.require_active_user();
  if p_document_type not in ('terms','privacy','request_safety','age_18') or char_length(trim(coalesce(p_version,''))) not between 1 and 40 then raise exception 'invalid_consent' using errcode='22023'; end if;
  insert into public.user_consents(user_id,document_type,version,request_id,metadata)
  values(auth.uid(),p_document_type,trim(p_version),p_request_id,coalesce(p_metadata,'{}'::jsonb))
  on conflict(user_id,document_type,version,(coalesce(request_id,'00000000-0000-0000-0000-000000000000'::uuid))) do update set accepted_at=now(),metadata=excluded.metadata
  returning id into out_id;
  return out_id;
end;
$$;

create or replace function public.request_account_deletion()
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare
  out_id uuid;
  p public.profiles;
  a record;
  r record;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into p from public.profiles where id=auth.uid() for update;
  if p.id is null then raise exception 'profile_missing' using errcode='P0002'; end if;
  if p.deleted_at is not null then raise exception 'account_already_deleted' using errcode='P0001'; end if;

  insert into public.account_deletion_requests(user_id,status)
  values(auth.uid(),'requested')
  on conflict(user_id,status) do update set requested_at=now(),error_note=null
  returning id into out_id;

  -- If the deleting user is the volunteer in an active assignment, safely reopen the request.
  for a in
    select aa.id,aa.request_id,aa.volunteer_id,rr.author_id
    from public.assignments aa join public.help_requests rr on rr.id=aa.request_id
    where aa.volunteer_id=auth.uid() and aa.status in ('volunteer_selected','in_progress','awaiting_confirmation','disputed')
    for update of aa,rr
  loop
    update public.assignments set status='cancelled',cancelled_by=auth.uid(),cancellation_reason='account_deleted',cancelled_at=now() where id=a.id;
    update public.help_requests set status='open',selected_volunteer_id=null where id=a.request_id and status<>'cancelled';
    update public.responses set status='withdrawn' where request_id=a.request_id and volunteer_id=auth.uid() and status in ('pending','accepted');
    update public.responses set status='pending' where request_id=a.request_id and volunteer_id<>auth.uid() and status='rejected';
    perform private.enqueue_notification(a.author_id,'assignment_cancelled','notifications.assignmentCancelled',null,'/requests/'||a.request_id::text,auth.uid(),jsonb_build_object('request_id',a.request_id,'assignment_id',a.id,'reason','account_deleted'),true);
  end loop;

  -- Cancel any still-active requests authored by this user and close their active assignments.
  for r in
    select id from public.help_requests
    where author_id=auth.uid() and status not in ('completed','cancelled')
    for update
  loop
    update public.assignments set status='cancelled',cancelled_by=auth.uid(),cancellation_reason='requester_account_deleted',cancelled_at=now()
      where request_id=r.id and status in ('volunteer_selected','in_progress','awaiting_confirmation','disputed');
    update public.help_requests set status='cancelled',selected_volunteer_id=null where id=r.id;
    update public.responses set status='withdrawn' where request_id=r.id and status='pending';
  end loop;

  -- Exact addresses/contact data are no longer needed after account deletion.
  update public.request_private_details d
     set address='[deleted]',location_notes=null,preferred_contact_method=null,contact_value=null,volunteer_instructions=null
   where exists(select 1 from public.help_requests r2 where r2.id=d.request_id and r2.author_id=auth.uid());

  update public.community_events set actor_id=null,is_anonymous=true,payload=payload-'profile_url'-'avatar_url'-'city' where actor_id=auth.uid();
  update public.notifications set actor_id=null where actor_id=auth.uid();
  update public.email_outbox set status='cancelled',recipient_email='deleted@invalid.local',payload='{}'::jsonb where user_id=auth.uid() and status in ('pending','processing');

  update public.profiles
     set full_name='Deleted ASAR user',email=null,phone=null,avatar_url=null,city=null,district=null,
         status='blocked',can_request=false,can_volunteer=false,share_community_activity=false,
         allow_public_profile=false,show_public_name=false,show_city=false,marketing_email_enabled=false,
         transactional_email_enabled=false,deleted_at=now()
   where id=auth.uid();
  update public.volunteer_profiles set bio=null,skills='{}',availability=null where user_id=auth.uid();
  update public.account_deletion_requests set status='anonymized',anonymized_at=now() where id=out_id;
  return out_id;
end;
$$;

create or replace function public.get_my_data_export()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  return jsonb_build_object(
    'profile',(select to_jsonb(p) - 'email_verified' - 'phone_verified' - 'identity_verified' - 'community_verified' from public.profiles p where p.id=auth.uid()),
    'volunteer_profile',(select to_jsonb(v) from public.volunteer_profiles v where v.user_id=auth.uid()),
    'requests',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.help_requests r where r.author_id=auth.uid()),
    'private_request_details',(select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) from public.request_private_details d join public.help_requests r on r.id=d.request_id where r.author_id=auth.uid()),
    'responses',(select coalesce(jsonb_agg(to_jsonb(x)),'[]'::jsonb) from public.responses x where x.volunteer_id=auth.uid()),
    'assignments',(select coalesce(jsonb_agg(to_jsonb(a)),'[]'::jsonb) from public.assignments a where a.volunteer_id=auth.uid() or exists(select 1 from public.help_requests r where r.id=a.request_id and r.author_id=auth.uid())),
    'reviews',(select coalesce(jsonb_agg(to_jsonb(v)),'[]'::jsonb) from public.reviews v where v.author_id=auth.uid() or v.receiver_id=auth.uid()),
    'reports',(select coalesce(jsonb_agg(to_jsonb(r)),'[]'::jsonb) from public.reports r where r.reporter_id=auth.uid()),
    'disputes',(select coalesce(jsonb_agg(to_jsonb(d)),'[]'::jsonb) from public.disputes d where d.opened_by=auth.uid() or exists(select 1 from public.assignments a join public.help_requests r on r.id=a.request_id where a.id=d.assignment_id and (a.volunteer_id=auth.uid() or r.author_id=auth.uid()))),
    'reputation',(select coalesce(jsonb_agg(to_jsonb(l)),'[]'::jsonb) from public.reputation_ledger l where l.user_id=auth.uid()),
    'consents',(select coalesce(jsonb_agg(to_jsonb(c)),'[]'::jsonb) from public.user_consents c where c.user_id=auth.uid()),
    'notifications',(select coalesce(jsonb_agg(to_jsonb(n)),'[]'::jsonb) from public.notifications n where n.user_id=auth.uid())
  );
end;
$$;

create or replace function public.track_product_event(p_event_name text,p_session_id text default null,p_request_id uuid default null,p_assignment_id uuid default null,p_locale text default null,p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_event_name not in ('landing_visit','signup','onboarding_complete','request_create','request_viewed','response_created','response_withdrawn','volunteer_selected','assignment_started','assignment_completed','completion_confirmed','reviewed') then raise exception 'invalid_event' using errcode='22023'; end if;
  insert into public.product_events(user_id,session_id,event_name,request_id,assignment_id,locale,metadata)
  values(auth.uid(),left(nullif(p_session_id,''),120),p_event_name,p_request_id,p_assignment_id,case when p_locale in ('ru','kk') then p_locale::public.app_language else null end,coalesce(p_metadata,'{}'::jsonb) - 'address' - 'phone' - 'email' - 'contact');
end;
$$;

create or replace function public.set_onboarding_progress(p_step integer)
returns integer
language plpgsql
security definer
set search_path=public,private
as $$
declare p public.profiles;
begin
  p:=private.require_active_user();
  if p.role is not null or p.onboarding_completed_at is not null then raise exception 'onboarding_already_completed' using errcode='23514'; end if;
  if p_step<0 or p_step>4 then raise exception 'invalid_step' using errcode='22023'; end if;
  update public.profiles set onboarding_step=p_step,last_active_at=now() where id=auth.uid();
  return p_step;
end;
$$;

-- Capability-based onboarding keeps the legacy role for compatibility but does not
-- prevent a volunteer from requesting help.
create or replace function public.complete_onboarding(p_role text)
returns public.profiles
language plpgsql
security definer
set search_path=public
as $$
declare result public.profiles;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode='42501'; end if;
  if p_role not in ('requester','volunteer') then raise exception 'invalid_role' using errcode='22023'; end if;
  update public.profiles
  set role=p_role::public.user_role,
      can_request=true,
      can_volunteer=(p_role='volunteer'),
      onboarding_step=5,
      onboarding_completed_at=coalesce(onboarding_completed_at,now()),
      email_verified=exists(select 1 from auth.users u where u.id=auth.uid() and u.email_confirmed_at is not null),
      last_active_at=now()
  where id=auth.uid() and status='active'
  returning * into result;
  if result.id is null then raise exception 'profile_not_available' using errcode='42501'; end if;
  if p_role='volunteer' then insert into public.volunteer_profiles(user_id,last_active_at) values(auth.uid(),now()) on conflict(user_id) do nothing; end if;
  perform private.track_product_event('onboarding_complete',null,null,null,result.preferred_language::text,jsonb_build_object('initial_role',p_role));
  return result;
end;
$$;

create or replace function public.enable_volunteer_capability()
returns void
language plpgsql
security definer
set search_path=public,private
as $$
begin
  perform private.require_active_user();
  update public.profiles set can_volunteer=true,last_active_at=now() where id=auth.uid();
  insert into public.volunteer_profiles(user_id,last_active_at) values(auth.uid(),now()) on conflict(user_id) do update set last_active_at=excluded.last_active_at;
end;
$$;

create or replace function private.validate_request_content(p_title text,p_description text,p_special text default null,p_instructions text default null)
returns void
language plpgsql
immutable
set search_path=public
as $$
declare t text:=lower(concat_ws(' ',p_title,p_description,p_special,p_instructions));
begin
  if t ~ '(не[[:space:]]+дыш|без[[:space:]]+сознани|сильн.{0,12}кровотеч|угроз.{0,8}жизни|сердечн.{0,8}приступ|пожар|горит[[:space:]]+(дом|квартир)|тыныс[[:space:]]+алмай|ес-түссіз|қатты[[:space:]]+қан[[:space:]]+кет|өмірге[[:space:]]+қауіп|өрт|not[[:space:]]+breathing|unconscious|severe[[:space:]]+bleeding|life-threatening)' then
    raise exception 'emergency_request_not_supported' using errcode='22023';
  end if;
  if t ~ '((купить|продать|куплю|продам).{0,30}(наркот|героин|кокаин|метамфет|закладк)|(қару|оружи).{0,30}(купить|продать|сату|сатып)|(подделать|подделка|жалған).{0,30}(документ|справк|куәлік)|(отмыть|обналичить).{0,30}(деньг|ақша))' then
    raise exception 'prohibited_request_content' using errcode='22023';
  end if;
  if t ~ '(cvv|cvc|код.{0,12}(из[[:space:]]+смс|sms|otp)|одноразов.{0,8}код|(номер|нөмір).{0,15}(банковск|банк).{0,15}(карт|карта))' then
    raise exception 'unsafe_contact_content' using errcode='22023';
  end if;
  if (length(t)-length(replace(t,'http','')))/4 >= 4 then
    raise exception 'spam_request_content' using errcode='22023';
  end if;
end;
$$;

create or replace function public.create_help_request(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare p public.profiles; new_id uuid; canonical_city public.cities; requested_city_id integer;
begin
  p:=private.require_active_user();
  perform private.enforce_rate_limit('request_create',10,interval '1 hour');
  if not p.can_request and p.role<>'admin' then raise exception 'request_capability_required' using errcode='42501'; end if;
  if p.onboarding_completed_at is null then raise exception 'onboarding_required' using errcode='42501'; end if;
  if coalesce((p_payload->>'safety_consent')::boolean,false) is not true then raise exception 'safety_consent_required' using errcode='22023'; end if;
  if p_payload->>'preferred_contact_method' not in ('phone','whatsapp','telegram','other') or char_length(trim(coalesce(p_payload->>'contact_value',''))) < 3 then raise exception 'contact_required' using errcode='22023'; end if;
  perform private.validate_request_content(p_payload->>'title',p_payload->>'description',p_payload->>'special_conditions',p_payload->>'volunteer_instructions');
  requested_city_id:=nullif(p_payload->>'city_id','')::integer;
  if requested_city_id is not null then
    select * into canonical_city from public.cities where id=requested_city_id and is_active;
    if canonical_city.id is null then raise exception 'invalid_city' using errcode='22023'; end if;
  end if;
  insert into public.help_requests(author_id,title,description,content_language,category_id,city,district,city_id,district_id,desired_date,time_from,time_to,urgency,help_format,status,image_url,special_conditions,reward_type,reward_note,reward_points)
  values(
    auth.uid(),trim(p_payload->>'title'),trim(p_payload->>'description'),(p_payload->>'content_language')::public.app_language,(p_payload->>'category_id')::uuid,
    coalesce(canonical_city.name_ru,trim(p_payload->>'city')),trim(p_payload->>'district'),requested_city_id,nullif(p_payload->>'district_id','')::integer,
    nullif(p_payload->>'desired_date','')::date,nullif(p_payload->>'time_from','')::time,nullif(p_payload->>'time_to','')::time,(p_payload->>'urgency')::public.urgency_level,(p_payload->>'help_format')::public.help_format,
    case when p_payload->>'status'='draft' then 'draft'::public.request_status else 'open'::public.request_status end,
    nullif(p_payload->>'image_url',''),nullif(p_payload->>'special_conditions',''),
    case when p_payload->>'reward_type' in ('thanks','symbolic') then p_payload->>'reward_type' else 'none' end,
    nullif(p_payload->>'reward_note',''),null
  ) returning id into new_id;
  insert into public.request_private_details(request_id,address,location_notes,preferred_contact_method,contact_value,volunteer_instructions)
  values(new_id,trim(p_payload->>'address'),nullif(trim(p_payload->>'location_notes'),''),case when p_payload->>'preferred_contact_method' in ('phone','whatsapp','telegram','other') then p_payload->>'preferred_contact_method' else 'phone' end,nullif(trim(p_payload->>'contact_value'),''),nullif(trim(p_payload->>'volunteer_instructions'),''));
  insert into public.user_consents(user_id,document_type,version,request_id)
  values(auth.uid(),'request_safety','2026-08-08',new_id)
  on conflict do nothing;
  if nullif(p_payload->>'draft_id','') is not null then delete from public.request_drafts where id=(p_payload->>'draft_id')::uuid and author_id=auth.uid(); end if;
  update public.profiles set last_active_at=now() where id=auth.uid();
  perform private.track_product_event('request_create',null,new_id,null,p.preferred_language::text,jsonb_build_object('status',case when p_payload->>'status'='draft' then 'draft' else 'open' end));
  return new_id;
end;
$$;

create or replace function public.update_help_request(p_request_id uuid,p_payload jsonb)
returns void
language plpgsql
security definer
set search_path=public,private
as $$
declare r public.help_requests; requested_city public.cities; requested_city_id integer;
begin
  perform private.require_active_user();
  select * into r from public.help_requests where id=p_request_id for update;
  if r.id is null or (r.author_id<>auth.uid() and not private.is_admin()) then raise exception 'request_update_forbidden' using errcode='42501'; end if;
  if r.status not in ('draft','open') then raise exception 'request_locked' using errcode='42501'; end if;
  if coalesce((p_payload->>'safety_consent')::boolean,false) is not true then raise exception 'safety_consent_required' using errcode='22023'; end if;
  if p_payload->>'preferred_contact_method' not in ('phone','whatsapp','telegram','other') or char_length(trim(coalesce(p_payload->>'contact_value',''))) < 3 then raise exception 'contact_required' using errcode='22023'; end if;
  perform private.validate_request_content(p_payload->>'title',p_payload->>'description',p_payload->>'special_conditions',p_payload->>'volunteer_instructions');
  requested_city_id:=nullif(p_payload->>'city_id','')::integer;
  if requested_city_id is not null then select * into requested_city from public.cities where id=requested_city_id and is_active; if requested_city.id is null then raise exception 'invalid_city' using errcode='22023'; end if; end if;
  update public.help_requests set
    title=trim(p_payload->>'title'),description=trim(p_payload->>'description'),content_language=(p_payload->>'content_language')::public.app_language,
    category_id=(p_payload->>'category_id')::uuid,city=coalesce(requested_city.name_ru,trim(p_payload->>'city')),district=trim(p_payload->>'district'),city_id=requested_city_id,district_id=nullif(p_payload->>'district_id','')::integer,
    desired_date=nullif(p_payload->>'desired_date','')::date,time_from=nullif(p_payload->>'time_from','')::time,time_to=nullif(p_payload->>'time_to','')::time,
    urgency=(p_payload->>'urgency')::public.urgency_level,help_format=(p_payload->>'help_format')::public.help_format,
    status=case when r.status='draft' and p_payload->>'status'='open' then 'open'::public.request_status else r.status end,
    image_url=nullif(p_payload->>'image_url',''),special_conditions=nullif(p_payload->>'special_conditions',''),
    reward_type=case when p_payload->>'reward_type' in ('thanks','symbolic') then p_payload->>'reward_type' else 'none' end,
    reward_note=nullif(p_payload->>'reward_note',''),reward_points=null
  where id=r.id;
  update public.request_private_details set address=trim(p_payload->>'address'),location_notes=nullif(trim(p_payload->>'location_notes'),''),preferred_contact_method=case when p_payload->>'preferred_contact_method' in ('phone','whatsapp','telegram','other') then p_payload->>'preferred_contact_method' else 'phone' end,contact_value=nullif(trim(p_payload->>'contact_value'),''),volunteer_instructions=nullif(trim(p_payload->>'volunteer_instructions'),'') where request_id=r.id;
end;
$$;

-- Registration consent is persisted from auth metadata by the trusted auth trigger.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path=public
as $$
declare safe_language public.app_language;
begin
  safe_language:=case when new.raw_user_meta_data->>'preferred_language'='kk' then 'kk'::public.app_language else 'ru'::public.app_language end;
  insert into public.profiles(id,full_name,email,role,preferred_language,can_request,can_volunteer)
  values(new.id,coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'),''),split_part(coalesce(new.email,'ASAR'),'@',1)),new.email,'requester',safe_language,true,false)
  on conflict(id) do nothing;

  if new.raw_user_meta_data->>'accepted_terms_version' is not null then
    insert into public.user_consents(user_id,document_type,version,metadata)
    values(new.id,'terms',left(new.raw_user_meta_data->>'accepted_terms_version',40),jsonb_build_object('source','signup'))
    on conflict(user_id,document_type,version,coalesce(request_id,'00000000-0000-0000-0000-000000000000'::uuid)) do nothing;
  end if;
  if new.raw_user_meta_data->>'accepted_privacy_version' is not null then
    insert into public.user_consents(user_id,document_type,version,metadata)
    values(new.id,'privacy',left(new.raw_user_meta_data->>'accepted_privacy_version',40),jsonb_build_object('source','signup'))
    on conflict(user_id,document_type,version,coalesce(request_id,'00000000-0000-0000-0000-000000000000'::uuid)) do nothing;
  end if;
  if coalesce((new.raw_user_meta_data->>'age_confirmed_18')::boolean,false) then
    insert into public.user_consents(user_id,document_type,version,metadata)
    values(new.id,'age_18','2026-08-08',jsonb_build_object('source','signup'))
    on conflict(user_id,document_type,version,coalesce(request_id,'00000000-0000-0000-0000-000000000000'::uuid)) do nothing;
  end if;
  insert into public.product_events(user_id,event_name,locale,metadata) values(new.id,'signup',safe_language,jsonb_build_object('source','auth_trigger'));
  return new;
end;
$$;

-- Trust age is time-dependent. This service-role function is intended for a daily
-- production scheduler and refreshes stale scores without exposing write access to users.
create or replace function public.refresh_stale_trust_scores(p_limit integer default 500)
returns integer
language plpgsql
security definer
set search_path=public
as $$
declare rec record; refreshed integer:=0;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'service_role_required' using errcode='42501'; end if;
  for rec in select id from public.profiles where deleted_at is null and status='active' and (trust_score_updated_at is null or trust_score_updated_at<now()-interval '24 hours') order by trust_score_updated_at nulls first limit greatest(1,least(p_limit,5000))
  loop
    perform public.recalculate_trust_score(rec.id); refreshed:=refreshed+1;
  end loop;
  return refreshed;
end;
$$;

create or replace function public.admin_get_product_metrics(p_from timestamptz default now()-interval '30 days',p_to timestamptz default now())
returns jsonb
language plpgsql
stable
security definer
set search_path=public,private
as $$
declare result jsonb;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode='42501'; end if;
  with request_cohort as (
    select r.id,r.created_at,
      (select min(x.created_at) from public.responses x where x.request_id=r.id and x.status<>'withdrawn') first_response_at,
      exists(select 1 from public.responses x where x.request_id=r.id and x.status<>'withdrawn') has_response
    from public.help_requests r where r.created_at>=p_from and r.created_at<p_to and r.status<>'draft'
  ), assignment_cohort as (
    select a.id,a.status,a.created_at from public.assignments a where a.created_at>=p_from and a.created_at<p_to
  ), funnel as (
    select event_name,count(*) events,count(distinct coalesce(user_id::text,session_id)) actors
    from public.product_events where created_at>=p_from and created_at<p_to group by event_name
  ), signups as (
    select user_id,min(created_at) signup_at from public.product_events where event_name='signup' and user_id is not null group by user_id
  ), retention as (
    select
      count(*) filter(where signup_at < p_to-interval '2 days') eligible_d1,
      count(*) filter(where signup_at < p_to-interval '2 days' and exists(select 1 from public.product_events e where e.user_id=s.user_id and e.created_at>=s.signup_at+interval '1 day' and e.created_at<s.signup_at+interval '2 days')) retained_d1,
      count(*) filter(where signup_at < p_to-interval '8 days') eligible_d7,
      count(*) filter(where signup_at < p_to-interval '8 days' and exists(select 1 from public.product_events e where e.user_id=s.user_id and e.created_at>=s.signup_at+interval '7 days' and e.created_at<s.signup_at+interval '8 days')) retained_d7,
      count(*) filter(where signup_at < p_to-interval '31 days') eligible_d30,
      count(*) filter(where signup_at < p_to-interval '31 days' and exists(select 1 from public.product_events e where e.user_id=s.user_id and e.created_at>=s.signup_at+interval '30 days' and e.created_at<s.signup_at+interval '31 days')) retained_d30
    from signups s
  ), segmented as (
    select
      count(distinct e.user_id) filter(where e.event_name='request_create') requester_users,
      count(distinct e.user_id) filter(where e.event_name='response_created') volunteer_users,
      count(distinct e.user_id) filter(where e.event_name='request_create' and exists(select 1 from public.product_events later where later.user_id=e.user_id and later.created_at>=e.created_at+interval '7 days')) requester_repeat,
      count(distinct e.user_id) filter(where e.event_name='response_created' and exists(select 1 from public.product_events later where later.user_id=e.user_id and later.created_at>=e.created_at+interval '7 days')) volunteer_repeat
    from public.product_events e where e.created_at>=p_from and e.created_at<p_to
  )
  select jsonb_build_object(
    'window',jsonb_build_object('from',p_from,'to',p_to),
    'definitions',jsonb_build_object(
      'response_rate','published requests in the window with at least one non-withdrawn response / published requests',
      'completion_rate','assignments created in the window that reached completed / all assignments created in the window',
      'time_to_first_response','average seconds from request publication record creation to first non-withdrawn response'),
    'requests_published',(select count(*) from request_cohort),
    'response_rate_percent',(select case when count(*)=0 then 0 else round(100.0*count(*) filter(where has_response)/count(*),1) end from request_cohort),
    'avg_time_to_first_response_seconds',(select round(avg(extract(epoch from first_response_at-created_at))) from request_cohort where first_response_at is not null),
    'assignments_created',(select count(*) from assignment_cohort),
    'completion_rate_percent',(select case when count(*)=0 then 0 else round(100.0*count(*) filter(where status='completed')/count(*),1) end from assignment_cohort),
    'funnel',(select coalesce(jsonb_object_agg(event_name,jsonb_build_object('events',events,'actors',actors)),'{}'::jsonb) from funnel),
    'retention',jsonb_build_object(
      'd1_percent',(select case when eligible_d1=0 then null else round(100.0*retained_d1/eligible_d1,1) end from retention),
      'd7_percent',(select case when eligible_d7=0 then null else round(100.0*retained_d7/eligible_d7,1) end from retention),
      'd30_percent',(select case when eligible_d30=0 then null else round(100.0*retained_d30/eligible_d30,1) end from retention),
      'requester_repeat_users',(select requester_repeat from segmented),
      'volunteer_repeat_users',(select volunteer_repeat from segmented)
    )
  ) into result;
  return result;
end;
$$;

-- Better active-volunteer metric: activity in the last 30 days.
create or replace function public.get_community_impact()
returns table(requests_completed bigint,active_volunteers bigint,success_rate numeric,cities bigint,help_hours numeric,positive_reviews bigint,people_supported bigint,requests_completed_this_week bigint)
language sql
stable
security definer
set search_path=public
as $$
with totals as (
  select count(*) filter(where status='completed') completed,
         count(*) filter(where status in ('completed','cancelled')) resolved,
         count(distinct author_id) filter(where status='completed') supported,
         count(distinct city) filter(where status='completed') city_count,
         count(*) filter(where status='completed' and updated_at>=date_trunc('week',now())) completed_week
  from public.help_requests
), minutes as (select coalesce(sum(help_minutes),0) total_minutes from public.assignments where status='completed')
select t.completed,
  (select count(*) from public.profiles p where p.status='active' and p.can_volunteer and p.deleted_at is null and p.last_active_at>=now()-interval '30 days'),
  case when t.resolved=0 then 0 else round(100.0*t.completed/t.resolved,1) end,
  t.city_count,round(m.total_minutes/60.0,1),(select count(*) from public.reviews where rating>=4),t.supported,t.completed_week
from totals t cross join minutes m;
$$;

-- RLS for newly introduced tables.
alter table public.notifications enable row level security;
alter table public.email_outbox enable row level security;
alter table public.disputes enable row level security;
alter table public.verification_requests enable row level security;
alter table public.user_consents enable row level security;
alter table public.account_deletion_requests enable row level security;
alter table public.product_events enable row level security;
alter table public.abuse_rate_events enable row level security;
alter table public.regions enable row level security;
alter table public.cities enable row level security;
alter table public.districts enable row level security;

create policy notifications_owner_read on public.notifications for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy notifications_owner_mark_read on public.notifications for update to authenticated using(user_id=auth.uid()) with check(user_id=auth.uid());
create policy email_outbox_admin_only on public.email_outbox for select to authenticated using(private.is_admin());
create policy disputes_participant_read on public.disputes for select to authenticated using(private.is_admin() or opened_by=auth.uid() or exists(select 1 from public.assignments a join public.help_requests r on r.id=a.request_id where a.id=assignment_id and (a.volunteer_id=auth.uid() or r.author_id=auth.uid())));
create policy verification_owner_read on public.verification_requests for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy consents_owner_read on public.user_consents for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy deletion_owner_read on public.account_deletion_requests for select to authenticated using(user_id=auth.uid() or private.is_admin());
create policy product_events_admin_read on public.product_events for select to authenticated using(private.is_admin());
create policy regions_public_read on public.regions for select to anon,authenticated using(true);
create policy cities_public_read on public.cities for select to anon,authenticated using(is_active);
create policy districts_public_read on public.districts for select to anon,authenticated using(is_active);

revoke all on public.notifications,public.email_outbox,public.disputes,public.verification_requests,public.user_consents,public.account_deletion_requests,public.product_events,public.abuse_rate_events from anon,authenticated;
grant select on public.notifications,public.disputes,public.verification_requests,public.user_consents,public.account_deletion_requests to authenticated;
grant update(read_at) on public.notifications to authenticated;
grant select on public.email_outbox,public.product_events to authenticated;
grant select on public.regions,public.cities,public.districts to anon,authenticated;

-- Explicit RPC surface.
revoke execute on function public.set_onboarding_progress(integer) from public,anon;
revoke execute on function public.enable_volunteer_capability() from public,anon;
revoke execute on function public.get_participant_profile(uuid,uuid) from public,anon;
revoke execute on function public.get_response_participant_profiles() from public,anon;
-- Public review RPC intentionally stays callable by anon/authenticated and returns sanitized fields only.
revoke execute on function public.get_my_assignments() from public,anon;
revoke execute on function public.get_assignment_context(uuid) from public,anon;
revoke execute on function public.create_response(uuid,text) from public,anon;
revoke execute on function public.withdraw_response(uuid) from public,anon;
revoke execute on function public.select_volunteer(uuid,uuid) from public,anon;
revoke execute on function public.start_assignment(uuid) from public,anon;
revoke execute on function public.mark_assignment_done(uuid,integer) from public,anon;
revoke execute on function public.confirm_assignment_completion(uuid) from public,anon;
revoke execute on function public.cancel_assignment(uuid,text) from public,anon;
revoke execute on function public.cancel_request(uuid,text) from public,anon;
revoke execute on function public.reopen_request(uuid) from public,anon;
revoke execute on function public.open_dispute(uuid,text,text) from public,anon;
revoke execute on function public.create_report(text,uuid,text,text) from public,anon;
revoke execute on function public.submit_review(uuid,integer,text) from public,anon;
revoke execute on function public.request_verification(text,text) from public,anon;
revoke execute on function public.admin_resolve_verification(uuid,boolean,text) from public,anon;
revoke execute on function public.admin_set_user_blocked(uuid,boolean,text) from public,anon;
revoke execute on function public.admin_resolve_dispute(uuid,text,text) from public,anon;
revoke execute on function public.admin_resolve_report(uuid,text,text) from public,anon;
revoke execute on function public.admin_list_users(text,text,text,text,integer,integer,integer) from public,anon;
revoke execute on function public.record_consent(text,text,uuid,jsonb) from public,anon;
revoke execute on function public.request_account_deletion() from public,anon;
revoke execute on function public.get_my_data_export() from public,anon;
revoke execute on function public.consume_rate_limit(text,integer,integer) from public,anon;
revoke execute on function public.admin_get_product_metrics(timestamptz,timestamptz) from public,anon;
revoke execute on function public.refresh_stale_trust_scores(integer) from public,anon,authenticated;

create or replace function public.purge_expired_sensitive_data()
returns jsonb
language plpgsql
security definer
set search_path=public
as $$
declare redacted_details integer:=0; deleted_notifications integer:=0; deleted_events integer:=0; deleted_rate integer:=0; deleted_outbox integer:=0;
begin
  if current_user not in ('postgres','service_role','supabase_admin') then raise exception 'service_role_required' using errcode='42501'; end if;
  update public.request_private_details d
     set address='[retention-redacted]',location_notes=null,preferred_contact_method=null,contact_value=null,volunteer_instructions=null,updated_at=now()
   where exists(select 1 from public.help_requests r where r.id=d.request_id and r.status in ('completed','cancelled') and r.updated_at < now()-interval '90 days')
     and d.address<>'[retention-redacted]';
  get diagnostics redacted_details=row_count;
  delete from public.notifications where created_at < now()-interval '180 days'; get diagnostics deleted_notifications=row_count;
  delete from public.product_events where created_at < now()-interval '13 months'; get diagnostics deleted_events=row_count;
  delete from public.abuse_rate_events where created_at < now()-interval '7 days'; get diagnostics deleted_rate=row_count;
  delete from public.email_outbox where status in ('sent','failed') and created_at < now()-interval '30 days'; get diagnostics deleted_outbox=row_count;
  return jsonb_build_object('redacted_private_details',redacted_details,'deleted_notifications',deleted_notifications,'deleted_product_events',deleted_events,'deleted_rate_events',deleted_rate,'deleted_email_outbox',deleted_outbox);
end;
$$;
revoke execute on function public.purge_expired_sensitive_data() from public,anon,authenticated;
grant execute on function public.purge_expired_sensitive_data() to service_role;



-- Draft writes are RPC-only so blocked users and legacy role checks cannot be bypassed via PostgREST.
revoke insert, update, delete on table public.request_drafts from authenticated;

drop policy if exists request_drafts_manage_self on public.request_drafts;
create policy request_drafts_read_self on public.request_drafts for select to authenticated
  using (author_id=auth.uid() or private.is_admin());

create or replace function public.save_request_draft(p_draft_id uuid,p_step integer,p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path=public,private
as $$
declare p public.profiles; result uuid;
begin
  p:=private.require_active_user();
  if p.onboarding_completed_at is null then raise exception 'onboarding_required' using errcode='42501'; end if;
  if not p.can_request and p.role<>'admin' then raise exception 'request_capability_required' using errcode='42501'; end if;
  perform private.enforce_rate_limit('draft_save',120,interval '1 hour');
  if p_draft_id is null then
    insert into public.request_drafts(author_id,current_step,payload)
    values(auth.uid(),greatest(1,least(7,p_step)),coalesce(p_payload,'{}'::jsonb))
    on conflict(author_id) where request_id is null do update
      set current_step=excluded.current_step,payload=excluded.payload,updated_at=now()
    returning id into result;
  else
    update public.request_drafts
       set current_step=greatest(1,least(7,p_step)),payload=coalesce(p_payload,'{}'::jsonb),updated_at=now()
     where id=p_draft_id and author_id=auth.uid()
     returning id into result;
    if result is null then raise exception 'draft_not_found' using errcode='P0002'; end if;
  end if;
  return result;
end;
$$;

-- Product analytics accepts only shallow, scalar, allow-listed metadata. This prevents
-- addresses/contact details from being smuggled into analytics in nested JSON.
create or replace function private.track_product_event(p_event_name text,p_session_id text default null,p_request_id uuid default null,p_assignment_id uuid default null,p_locale text default null,p_metadata jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path=public
as $$
declare safe_metadata jsonb:='{}'::jsonb; k text; v jsonb;
begin
  if p_event_name not in ('landing_visit','signup','onboarding_complete','request_create','request_viewed','response_created','response_withdrawn','volunteer_selected','assignment_started','assignment_completed','completion_confirmed','reviewed') then
    raise exception 'invalid_event' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(p_metadata,'{}'::jsonb))='object' then
    for k,v in select key,value from jsonb_each(coalesce(p_metadata,'{}'::jsonb)) loop
      if k in ('status','initial_role','rating','help_minutes','source')
         and jsonb_typeof(v) in ('string','number','boolean','null') then
        safe_metadata:=safe_metadata||jsonb_build_object(k,v);
      end if;
    end loop;
  end if;
  insert into public.product_events(user_id,session_id,event_name,request_id,assignment_id,locale,metadata)
  values(auth.uid(),left(nullif(p_session_id,''),120),p_event_name,p_request_id,p_assignment_id,case when p_locale in ('ru','kk') then p_locale::public.app_language else null end,safe_metadata);
end;
$$;

grant execute on function public.save_request_draft(uuid,integer,jsonb) to authenticated;
grant execute on function public.set_onboarding_progress(integer) to authenticated;
grant execute on function public.enable_volunteer_capability() to authenticated;
grant execute on function public.get_participant_profile(uuid,uuid) to authenticated;
grant execute on function public.get_response_participant_profiles() to authenticated;
grant execute on function public.get_my_assignments() to authenticated;
grant execute on function public.get_assignment_context(uuid) to authenticated;
grant execute on function public.create_response(uuid,text) to authenticated;
grant execute on function public.withdraw_response(uuid) to authenticated;
grant execute on function public.select_volunteer(uuid,uuid) to authenticated;
grant execute on function public.start_assignment(uuid) to authenticated;
grant execute on function public.mark_assignment_done(uuid,integer) to authenticated;
grant execute on function public.confirm_assignment_completion(uuid) to authenticated;
grant execute on function public.cancel_assignment(uuid,text) to authenticated;
grant execute on function public.cancel_request(uuid,text) to authenticated;
grant execute on function public.reopen_request(uuid) to authenticated;
grant execute on function public.open_dispute(uuid,text,text) to authenticated;
grant execute on function public.create_report(text,uuid,text,text) to authenticated;
grant execute on function public.submit_review(uuid,integer,text) to authenticated;
grant execute on function public.request_verification(text,text) to authenticated;
grant execute on function public.admin_resolve_verification(uuid,boolean,text) to authenticated;
grant execute on function public.admin_set_user_blocked(uuid,boolean,text) to authenticated;
grant execute on function public.admin_resolve_dispute(uuid,text,text) to authenticated;
grant execute on function public.admin_remove_request_image(uuid,text) to authenticated;
grant execute on function public.admin_resolve_report(uuid,text,text) to authenticated;
grant execute on function public.admin_list_users(text,text,text,text,integer,integer,integer) to authenticated;
grant execute on function public.record_consent(text,text,uuid,jsonb) to authenticated;
grant execute on function public.request_account_deletion() to authenticated;
grant execute on function public.get_my_data_export() to authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to authenticated;
grant execute on function public.admin_get_product_metrics(timestamptz,timestamptz) to authenticated;
grant execute on function public.refresh_stale_trust_scores(integer) to service_role;
grant execute on function public.get_public_profile_reviews(uuid) to anon,authenticated;
revoke execute on function public.track_product_event(text,text,uuid,uuid,text,jsonb) from public,anon,authenticated;
revoke execute on function private.track_product_event(text,text,uuid,uuid,text,jsonb) from public,anon,authenticated;

create or replace function public.track_public_product_event(p_event_name text,p_session_id text default null,p_request_id uuid default null,p_locale text default null)
returns void
language plpgsql
security definer
set search_path=public
as $$
begin
  if p_event_name not in ('landing_visit','request_viewed') then raise exception 'invalid_event' using errcode='22023'; end if;
  if p_event_name='landing_visit' then p_request_id:=null; end if;
  if p_event_name='request_viewed' and (p_request_id is null or not exists(select 1 from public.help_requests where id=p_request_id and status='open')) then
    raise exception 'request_not_found' using errcode='P0002';
  end if;
  insert into public.product_events(user_id,session_id,event_name,request_id,locale,metadata)
  values(auth.uid(),left(nullif(p_session_id,''),120),p_event_name,p_request_id,case when p_locale in ('ru','kk') then p_locale::public.app_language else null end,'{}'::jsonb);
end;
$$;
revoke execute on function public.track_public_product_event(text,text,uuid,text) from public;
grant execute on function public.track_public_product_event(text,text,uuid,text) to anon,authenticated;


-- Direct Storage writes are disabled; authenticated uploads go through /api/uploads.
drop policy if exists storage_owner_insert_images on storage.objects;
drop policy if exists storage_owner_update_images on storage.objects;
drop policy if exists storage_owner_delete_images on storage.objects;

-- Legacy overload no longer used for completion; remove execution to prevent bypass.
revoke execute on function public.mark_assignment_done(uuid) from public,anon,authenticated;

commit;
