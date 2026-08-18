begin;

-- A new account has no marketplace role. The role becomes authoritative only
-- after the server-side onboarding transaction completes.
alter table public.profiles alter column role drop not null;
alter table public.profiles alter column role drop default;

alter table public.profiles
  add column if not exists onboarding_step smallint not null default 0 check (onboarding_step between 0 and 5),
  add column if not exists onboarding_completed_at timestamptz,
  add column if not exists email_verified boolean not null default false,
  add column if not exists phone_verified boolean not null default false,
  add column if not exists identity_verified boolean not null default false,
  add column if not exists community_verified boolean not null default false,
  add column if not exists trust_score smallint not null default 0 check (trust_score between 0 and 100),
  add column if not exists trust_level text not null default 'new_member' check (trust_level in ('new_member','building_trust','trusted_member','highly_trusted','community_verified')),
  add column if not exists trust_score_updated_at timestamptz,
  add column if not exists reputation_points integer not null default 0 check (reputation_points >= 0),
  add column if not exists reputation_level text not null default 'new_member' check (reputation_level in ('new_member','kind_neighbor','active_helper','trusted_volunteer','community_supporter','community_hero','asar_ambassador')),
  add column if not exists consistency_streak integer not null default 0 check (consistency_streak >= 0),
  add column if not exists community_contribution_count integer not null default 0 check (community_contribution_count >= 0),
  add column if not exists share_community_activity boolean not null default true,
  add column if not exists show_public_name boolean not null default false,
  add column if not exists show_city boolean not null default true,
  add column if not exists allow_public_profile boolean not null default true;

-- Existing members should not be forced through onboarding again. Only users
-- created by the new trigger start in the pending state.
update public.profiles
set onboarding_step = 5,
    onboarding_completed_at = coalesce(onboarding_completed_at, created_at)
where role is not null and onboarding_completed_at is null;

alter table public.volunteer_profiles
  add column if not exists reputation_points integer not null default 0 check (reputation_points >= 0),
  add column if not exists reputation_level text not null default 'new_member',
  add column if not exists positive_reviews_count integer not null default 0 check (positive_reviews_count >= 0),
  add column if not exists successful_helps_count integer not null default 0 check (successful_helps_count >= 0),
  add column if not exists last_active_at timestamptz;

alter table public.help_requests
  add column if not exists reward_type text not null default 'none' check (reward_type in ('none','thanks','bonus_points','symbolic')),
  add column if not exists reward_note text check (char_length(reward_note) <= 240),
  add column if not exists reward_points smallint check (reward_points between 0 and 100);

alter table public.request_private_details
  add column if not exists volunteer_instructions text check (char_length(volunteer_instructions) <= 1000);

alter table public.assignments
  add column if not exists help_minutes integer not null default 0 check (help_minutes between 0 and 1440);

alter table public.achievements
  add column if not exists category text not null default 'community',
  add column if not exists rarity text not null default 'common' check (rarity in ('common','uncommon','rare','special')),
  add column if not exists points_reward integer not null default 0 check (points_reward between 0 and 500),
  add column if not exists sort_order integer not null default 0,
  add column if not exists criteria jsonb not null default '{}'::jsonb;

create table if not exists public.request_drafts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  request_id uuid references public.help_requests(id) on delete cascade,
  current_step smallint not null default 1 check (current_step between 1 and 7),
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists request_drafts_one_new_per_author
  on public.request_drafts(author_id) where request_id is null;
create index if not exists request_drafts_author_updated_idx
  on public.request_drafts(author_id, updated_at desc);

create table if not exists public.community_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null check (event_type in ('help_completed','new_volunteer','achievement_unlocked','community_milestone','verified_story','weekly_impact','new_city','badge_received','initiative')),
  actor_id uuid references public.profiles(id) on delete set null,
  target_type text,
  target_id uuid,
  city text,
  category_slug text,
  payload jsonb not null default '{}'::jsonb,
  is_anonymous boolean not null default false,
  is_published boolean not null default true,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists community_events_feed_idx
  on public.community_events(is_published, occurred_at desc);
create unique index if not exists community_events_source_unique
  on public.community_events(event_type, target_type, target_id)
  where target_id is not null;

create table if not exists public.reputation_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  points integer not null check (points between -500 and 500),
  reason text not null,
  source_type text not null,
  source_id uuid not null,
  created_at timestamptz not null default now(),
  unique(user_id, reason, source_type, source_id)
);

create index if not exists reputation_ledger_user_idx
  on public.reputation_ledger(user_id, created_at desc);

create table if not exists public.achievement_progress (
  user_id uuid not null references public.profiles(id) on delete cascade,
  achievement_id uuid not null references public.achievements(id) on delete cascade,
  progress integer not null default 0 check (progress >= 0),
  target integer not null default 1 check (target > 0),
  unlocked_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table if not exists public.moderation_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references public.profiles(id) on delete restrict,
  target_user_id uuid references public.profiles(id) on delete set null,
  action_type text not null,
  reason text not null check (char_length(reason) between 5 and 1000),
  previous_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

create index if not exists moderation_actions_target_idx
  on public.moderation_actions(target_user_id, created_at desc);

drop trigger if exists request_drafts_updated_at on public.request_drafts;
create trigger request_drafts_updated_at before update on public.request_drafts
for each row execute function public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  safe_language public.app_language;
begin
  safe_language := case when new.raw_user_meta_data->>'preferred_language' = 'kk' then 'kk'::public.app_language else 'ru'::public.app_language end;
  insert into public.profiles(id, full_name, email, role, preferred_language, onboarding_step, email_verified)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'full_name'), ''), split_part(coalesce(new.email, 'ASAR'), '@', 1)),
    new.email,
    null,
    safe_language,
    0,
    new.email_confirmed_at is not null
  );
  return new;
end;
$$;

create or replace function public.protect_profile_role()
returns trigger
language plpgsql
set search_path = public, private
as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') and not private.is_admin() then
    if new.role is distinct from old.role
       or new.onboarding_completed_at is distinct from old.onboarding_completed_at
       or new.email_verified is distinct from old.email_verified
       or new.phone_verified is distinct from old.phone_verified
       or new.identity_verified is distinct from old.identity_verified
       or new.community_verified is distinct from old.community_verified
       or new.trust_score is distinct from old.trust_score
       or new.trust_level is distinct from old.trust_level
       or new.reputation_points is distinct from old.reputation_points
       or new.reputation_level is distinct from old.reputation_level
       or new.consistency_streak is distinct from old.consistency_streak
       or new.community_contribution_count is distinct from old.community_contribution_count then
      raise exception 'protected_profile_fields_forbidden' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create or replace function public.complete_onboarding(p_role text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  result public.profiles;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if p_role not in ('requester','volunteer') then raise exception 'invalid_role' using errcode = '22023'; end if;

  update public.profiles
  set role = p_role::public.user_role,
      onboarding_step = 5,
      onboarding_completed_at = coalesce(onboarding_completed_at, now()),
      email_verified = exists(select 1 from auth.users u where u.id = auth.uid() and u.email_confirmed_at is not null),
      updated_at = now()
  where id = auth.uid() and (role is null or role = p_role::public.user_role)
  returning * into result;

  if result.id is null then raise exception 'onboarding_already_completed' using errcode = '23514'; end if;
  if p_role = 'volunteer' then
    insert into public.volunteer_profiles(user_id) values (auth.uid()) on conflict (user_id) do nothing;
    insert into public.community_events(event_type, actor_id, target_type, target_id, city, is_anonymous)
    values ('new_volunteer', auth.uid(), 'profile', auth.uid(), result.city, not result.show_public_name)
    on conflict do nothing;
  end if;
  return result;
end;
$$;

create or replace function public.save_request_draft(p_draft_id uuid, p_step integer, p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare result uuid;
begin
  if auth.uid() is null then raise exception 'unauthorized' using errcode = '42501'; end if;
  if not exists(select 1 from public.profiles where id = auth.uid() and role in ('requester','admin') and onboarding_completed_at is not null and status = 'active') then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_draft_id is null then
    insert into public.request_drafts(author_id, current_step, payload)
    values (auth.uid(), greatest(1, least(7, p_step)), coalesce(p_payload, '{}'::jsonb))
    on conflict (author_id) where request_id is null do update
      set current_step = excluded.current_step, payload = excluded.payload, updated_at = now()
    returning id into result;
  else
    update public.request_drafts
    set current_step = greatest(1, least(7, p_step)), payload = coalesce(p_payload, '{}'::jsonb), updated_at = now()
    where id = p_draft_id and author_id = auth.uid()
    returning id into result;
    if result is null then raise exception 'draft_not_found' using errcode = 'P0002'; end if;
  end if;
  return result;
end;
$$;

create or replace function public.recalculate_trust_score(p_user_id uuid)
returns smallint
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  p public.profiles;
  completed_count integer := 0;
  review_count integer := 0;
  positive_count integer := 0;
  account_days integer := 0;
  violation_count integer := 0;
  score integer := 0;
  level_name text := 'new_member';
begin
  select * into p from public.profiles where id = p_user_id;
  if p.id is null then raise exception 'profile_not_found'; end if;
  select count(*) into completed_count from public.assignments where (volunteer_id = p_user_id or request_id in (select id from public.help_requests where author_id = p_user_id)) and status = 'completed';
  select count(*), count(*) filter (where rating >= 4) into review_count, positive_count from public.reviews where receiver_id = p_user_id;
  select greatest(0, extract(day from now() - created_at)::integer) into account_days from public.profiles where id = p_user_id;
  select count(*) into violation_count from public.moderation_actions where target_user_id = p_user_id and action_type = 'confirmed_violation';

  score := score + case when p.email_verified then 15 else 0 end;
  score := score + case when p.phone_verified then 10 else 0 end;
  score := score + case when p.identity_verified then 20 else 0 end;
  score := score + least(10, floor(account_days / 18.0)::integer);
  score := score + least(20, completed_count * 2);
  if review_count >= 3 then score := score + least(15, round(15.0 * positive_count / review_count)::integer); end if;
  score := score + least(10, p.community_contribution_count);
  score := greatest(0, least(100, score - least(20, violation_count * 10)));
  if p.community_verified and score >= 80 then score := greatest(score, 90); end if;
  level_name := case when score >= 90 then 'community_verified' when score >= 70 then 'highly_trusted' when score >= 45 then 'trusted_member' when score >= 25 then 'building_trust' else 'new_member' end;

  update public.profiles set trust_score = score, trust_level = level_name, trust_score_updated_at = now() where id = p_user_id;
  return score::smallint;
end;
$$;

create or replace function public.recalculate_reputation(p_user_id uuid)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare points_total integer := 0; level_name text := 'new_member'; level_number integer := 1;
begin
  select greatest(0, coalesce(sum(points),0))::integer into points_total from public.reputation_ledger where user_id = p_user_id;
  level_name := case when points_total >= 5000 then 'asar_ambassador' when points_total >= 3000 then 'community_hero' when points_total >= 1600 then 'community_supporter' when points_total >= 800 then 'trusted_volunteer' when points_total >= 300 then 'active_helper' when points_total >= 100 then 'kind_neighbor' else 'new_member' end;
  level_number := case level_name when 'asar_ambassador' then 7 when 'community_hero' then 6 when 'community_supporter' then 5 when 'trusted_volunteer' then 4 when 'active_helper' then 3 when 'kind_neighbor' then 2 else 1 end;
  update public.profiles set reputation_points = points_total, reputation_level = level_name where id = p_user_id;
  update public.volunteer_profiles set reputation_points = points_total, reputation_level = level_name, level = level_number where user_id = p_user_id;
  return points_total;
end;
$$;

create or replace function public.refresh_achievement_progress(p_user_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare completed_count integer;
begin
  select count(*) into completed_count from public.assignments where volunteer_id = p_user_id and status = 'completed';
  insert into public.achievement_progress(user_id, achievement_id, progress, target, unlocked_at)
  select p_user_id, a.id, least(completed_count, greatest(1, a.required_completed_tasks)), greatest(1, a.required_completed_tasks),
    case when completed_count >= greatest(1, a.required_completed_tasks) then now() else null end
  from public.achievements a
  on conflict (user_id, achievement_id) do update set
    progress = excluded.progress,
    target = excluded.target,
    unlocked_at = coalesce(public.achievement_progress.unlocked_at, excluded.unlocked_at),
    updated_at = now();

  insert into public.volunteer_achievements(volunteer_id, achievement_id, awarded_at)
  select p_user_id, achievement_id, unlocked_at from public.achievement_progress
  where user_id = p_user_id and unlocked_at is not null
  on conflict do nothing;

  insert into public.community_events(event_type, actor_id, target_type, target_id, is_anonymous, payload, occurred_at)
  select 'achievement_unlocked', p_user_id, 'achievement', ap.achievement_id, not p.show_public_name,
    jsonb_build_object('achievement_id', ap.achievement_id), ap.unlocked_at
  from public.achievement_progress ap
  join public.profiles p on p.id = ap.user_id
  where ap.user_id = p_user_id and ap.unlocked_at is not null
  on conflict do nothing;
end;
$$;

create or replace function public.handle_completed_help()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare request_row public.help_requests; actor_profile public.profiles;
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    select * into request_row from public.help_requests where id = new.request_id;
    select * into actor_profile from public.profiles where id = new.volunteer_id;
    insert into public.reputation_ledger(user_id, points, reason, source_type, source_id)
      values (new.volunteer_id, 100, 'completed_help', 'assignment', new.id) on conflict do nothing;
    update public.profiles set community_contribution_count = community_contribution_count + 1 where id = new.volunteer_id;
    insert into public.community_events(event_type, actor_id, target_type, target_id, city, category_slug, is_anonymous, payload)
      select 'help_completed', new.volunteer_id, 'assignment', new.id, request_row.city, c.slug,
        not actor_profile.show_public_name, jsonb_build_object('help_minutes', new.help_minutes)
      from public.categories c where c.id = request_row.category_id
      on conflict do nothing;
    perform public.recalculate_reputation(new.volunteer_id);
    perform public.refresh_achievement_progress(new.volunteer_id);
    perform public.recalculate_trust_score(new.volunteer_id);
    perform public.recalculate_trust_score(request_row.author_id);
  end if;
  return new;
end;
$$;

drop trigger if exists completed_help_platform_updates on public.assignments;
create trigger completed_help_platform_updates after update of status on public.assignments
for each row execute function public.handle_completed_help();

create or replace function public.handle_positive_review_reputation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.rating >= 4 then
    insert into public.reputation_ledger(user_id, points, reason, source_type, source_id)
      values (new.receiver_id, 20, 'positive_review', 'review', new.id) on conflict do nothing;
    perform public.recalculate_reputation(new.receiver_id);
  end if;
  perform public.recalculate_trust_score(new.receiver_id);
  return new;
end;
$$;

drop trigger if exists positive_review_platform_updates on public.reviews;
create trigger positive_review_platform_updates after insert on public.reviews
for each row execute function public.handle_positive_review_reputation();

create or replace view public.public_profiles with (security_barrier = true) as
select id,
  case when show_public_name then full_name else concat(left(full_name, 1), '.') end as full_name,
  avatar_url, role,
  case when show_city then city else null end as city,
  case when show_city then district else null end as district,
  rating, completed_tasks_count, trust_score, trust_level, reputation_points,
  reputation_level, community_verified, created_at, email_verified, phone_verified, identity_verified
from public.profiles
where status = 'active' and allow_public_profile = true and role is not null;

create or replace view public.public_community_events with (security_barrier = true) as
select e.id, e.event_type,
  case when e.is_anonymous or not coalesce(p.show_public_name, false) then null else p.full_name end as actor_name,
  case when e.is_anonymous then null else p.avatar_url end as actor_avatar_url,
  e.city, e.category_slug, e.payload, e.occurred_at
from public.community_events e
left join public.profiles p on p.id = e.actor_id
where e.is_published = true;

create or replace function public.get_community_impact()
returns table (
  requests_completed bigint,
  active_volunteers bigint,
  success_rate numeric,
  cities bigint,
  help_hours numeric,
  positive_reviews bigint,
  people_supported bigint,
  requests_completed_this_week bigint
)
language sql
stable
security definer
set search_path = public
as $$
  with totals as (
    select
      count(*) filter (where status = 'completed') as completed,
      count(*) filter (where status in ('completed','cancelled','disputed')) as resolved,
      count(distinct author_id) filter (where status = 'completed') as supported,
      count(distinct city) filter (where status = 'completed') as city_count,
      count(*) filter (where status = 'completed' and updated_at >= date_trunc('week', now())) as completed_week
    from public.help_requests
  ), minutes as (
    select coalesce(sum(help_minutes),0) as total_minutes from public.assignments where status = 'completed'
  )
  select t.completed,
    (select count(*) from public.profiles where role = 'volunteer' and status = 'active'),
    case when t.resolved = 0 then 0 else round(100.0 * t.completed / t.resolved, 1) end,
    t.city_count,
    round(m.total_minutes / 60.0, 1),
    (select count(*) from public.reviews where rating >= 4),
    t.supported,
    t.completed_week
  from totals t cross join minutes m;
$$;

alter table public.request_drafts enable row level security;
alter table public.community_events enable row level security;
alter table public.reputation_ledger enable row level security;
alter table public.achievement_progress enable row level security;
alter table public.moderation_actions enable row level security;

create policy request_drafts_manage_self on public.request_drafts for all to authenticated
  using (author_id = (select auth.uid()) or (select private.is_admin()))
  with check (author_id = (select auth.uid()) or (select private.is_admin()));
create policy community_events_public_read on public.community_events for select to anon, authenticated
  using (is_published = true or (select private.is_admin()));
create policy community_events_admin_manage on public.community_events for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy reputation_ledger_self_read on public.reputation_ledger for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy achievement_progress_self_read on public.achievement_progress for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_admin()));
create policy moderation_actions_admin_only on public.moderation_actions for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and admin_id = (select auth.uid()));

grant select on public.public_community_events to anon, authenticated;
grant execute on function public.get_community_impact() to anon, authenticated;
grant execute on function public.complete_onboarding(text) to authenticated;
grant execute on function public.save_request_draft(uuid, integer, jsonb) to authenticated;
revoke execute on function public.recalculate_trust_score(uuid) from public, anon, authenticated;
revoke execute on function public.recalculate_reputation(uuid) from public, anon, authenticated;
revoke execute on function public.refresh_achievement_progress(uuid) from public, anon, authenticated;

commit;
