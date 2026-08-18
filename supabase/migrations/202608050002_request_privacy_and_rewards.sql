begin;

create or replace function public.create_help_request(p_payload jsonb)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id uuid;
  caller_role public.user_role;
  caller_status public.user_status;
begin
  select role, status into caller_role, caller_status from public.profiles
  where id = (select auth.uid()) and onboarding_completed_at is not null;
  if caller_role not in ('requester', 'admin') or caller_status <> 'active' then
    raise exception 'requester_required' using errcode = '42501';
  end if;
  if coalesce((p_payload->>'safety_consent')::boolean, false) is not true then
    raise exception 'safety_consent_required' using errcode = '22023';
  end if;
  if coalesce(p_payload->>'reward_type','none') = 'bonus_points'
     and coalesce((p_payload->>'reward_points')::integer, 0) not between 0 and 100 then
    raise exception 'invalid_reward_points' using errcode = '22023';
  end if;

  insert into public.help_requests(
    author_id,title,description,content_language,category_id,city,district,
    desired_date,time_from,time_to,urgency,help_format,status,image_url,
    special_conditions,reward_type,reward_note,reward_points
  ) values (
    (select auth.uid()), p_payload->>'title', p_payload->>'description',
    (p_payload->>'content_language')::public.app_language,
    (p_payload->>'category_id')::uuid, p_payload->>'city', p_payload->>'district',
    nullif(p_payload->>'desired_date','')::date, nullif(p_payload->>'time_from','')::time,
    nullif(p_payload->>'time_to','')::time, (p_payload->>'urgency')::public.urgency_level,
    (p_payload->>'help_format')::public.help_format, (p_payload->>'status')::public.request_status,
    nullif(p_payload->>'image_url',''), nullif(p_payload->>'special_conditions',''),
    coalesce(nullif(p_payload->>'reward_type',''),'none'), nullif(p_payload->>'reward_note',''),
    case when p_payload->>'reward_type' = 'bonus_points' then coalesce((p_payload->>'reward_points')::smallint,0) else null end
  ) returning id into new_id;

  insert into public.request_private_details(
    request_id,address,location_notes,preferred_contact_method,volunteer_instructions
  ) values (
    new_id, p_payload->>'address', nullif(p_payload->>'location_notes',''),
    nullif(p_payload->>'preferred_contact_method',''), nullif(p_payload->>'volunteer_instructions','')
  );

  if nullif(p_payload->>'draft_id','') is not null then
    delete from public.request_drafts where id = (p_payload->>'draft_id')::uuid and author_id = (select auth.uid());
  end if;
  return new_id;
end;
$$;

create or replace function public.update_help_request(p_request_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare current_request public.help_requests%rowtype;
begin
  select * into current_request from public.help_requests where id = p_request_id for update;
  if not found or (current_request.author_id <> (select auth.uid()) and not private.is_admin()) then
    raise exception 'request_update_forbidden' using errcode = '42501';
  end if;
  if current_request.status not in ('draft', 'open') then raise exception 'request_locked' using errcode = '42501'; end if;
  if coalesce((p_payload->>'safety_consent')::boolean, false) is not true then raise exception 'safety_consent_required' using errcode = '22023'; end if;

  update public.help_requests set
    title = p_payload->>'title', description = p_payload->>'description',
    content_language = (p_payload->>'content_language')::public.app_language,
    category_id = (p_payload->>'category_id')::uuid, city = p_payload->>'city', district = p_payload->>'district',
    desired_date = nullif(p_payload->>'desired_date','')::date, time_from = nullif(p_payload->>'time_from','')::time,
    time_to = nullif(p_payload->>'time_to','')::time, urgency = (p_payload->>'urgency')::public.urgency_level,
    help_format = (p_payload->>'help_format')::public.help_format, status = (p_payload->>'status')::public.request_status,
    image_url = nullif(p_payload->>'image_url',''), special_conditions = nullif(p_payload->>'special_conditions',''),
    reward_type = coalesce(nullif(p_payload->>'reward_type',''),'none'), reward_note = nullif(p_payload->>'reward_note',''),
    reward_points = case when p_payload->>'reward_type' = 'bonus_points' then coalesce((p_payload->>'reward_points')::smallint,0) else null end
  where id = p_request_id;

  update public.request_private_details set
    address = p_payload->>'address', location_notes = nullif(p_payload->>'location_notes',''),
    preferred_contact_method = nullif(p_payload->>'preferred_contact_method',''),
    volunteer_instructions = nullif(p_payload->>'volunteer_instructions','')
  where request_id = p_request_id;
end;
$$;

create or replace function public.protect_request_critical_fields()
returns trigger language plpgsql set search_path = public as $$
begin
  if current_user not in ('postgres', 'service_role', 'supabase_admin') then
    if new.author_id <> old.author_id or new.selected_volunteer_id is distinct from old.selected_volunteer_id then raise exception 'critical_fields_forbidden' using errcode = '42501'; end if;
    if old.status not in ('draft', 'open') and row(new.title,new.description,new.category_id,new.city,new.district,new.desired_date,new.time_from,new.time_to,new.urgency,new.help_format,new.image_url,new.special_conditions,new.reward_type,new.reward_note,new.reward_points) is distinct from row(old.title,old.description,old.category_id,old.city,old.district,old.desired_date,old.time_from,old.time_to,old.urgency,old.help_format,old.image_url,old.special_conditions,old.reward_type,old.reward_note,old.reward_points) then raise exception 'completed_request_locked' using errcode = '42501'; end if;
    if new.status <> old.status and not (old.status in ('draft','open') and new.status = 'cancelled') then raise exception 'status_transition_forbidden' using errcode = '42501'; end if;
  end if;
  return new;
end;
$$;

commit;
