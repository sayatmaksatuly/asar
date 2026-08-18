begin;

create or replace function public.admin_adjust_trust_score(p_user_id uuid, p_new_score integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare old_score integer; new_level text;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_new_score not between 0 and 100 or char_length(trim(p_reason)) < 5 then raise exception 'invalid_adjustment' using errcode = '22023'; end if;
  select trust_score into old_score from public.profiles where id = p_user_id for update;
  if old_score is null then raise exception 'profile_not_found' using errcode = 'P0002'; end if;
  new_level := case when p_new_score >= 90 then 'community_verified' when p_new_score >= 70 then 'highly_trusted' when p_new_score >= 45 then 'trusted_member' when p_new_score >= 25 then 'building_trust' else 'new_member' end;
  insert into public.moderation_actions(admin_id,target_user_id,action_type,reason,previous_value,new_value)
  values (auth.uid(),p_user_id,'trust_score_adjustment',trim(p_reason),jsonb_build_object('trust_score',old_score),jsonb_build_object('trust_score',p_new_score));
  update public.profiles set trust_score=p_new_score,trust_level=new_level,trust_score_updated_at=now() where id=p_user_id;
end;
$$;

create or replace function public.admin_set_verification(p_user_id uuid, p_kind text, p_verified boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare old_value boolean;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_kind not in ('phone','identity','community') or char_length(trim(p_reason)) < 5 then raise exception 'invalid_verification' using errcode = '22023'; end if;
  select case p_kind when 'phone' then phone_verified when 'identity' then identity_verified else community_verified end into old_value from public.profiles where id=p_user_id for update;
  insert into public.moderation_actions(admin_id,target_user_id,action_type,reason,previous_value,new_value)
  values (auth.uid(),p_user_id,'verification_'||p_kind,trim(p_reason),jsonb_build_object('verified',old_value),jsonb_build_object('verified',p_verified));
  update public.profiles set
    phone_verified=case when p_kind='phone' then p_verified else phone_verified end,
    identity_verified=case when p_kind='identity' then p_verified else identity_verified end,
    community_verified=case when p_kind='community' then p_verified else community_verified end
  where id=p_user_id;
  perform public.recalculate_trust_score(p_user_id);
end;
$$;

create or replace function public.admin_set_community_event_visibility(p_event_id uuid, p_visible boolean, p_reason text)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare actor uuid; previous boolean;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if char_length(trim(p_reason)) < 5 then raise exception 'reason_required' using errcode = '22023'; end if;
  select actor_id,is_published into actor,previous from public.community_events where id=p_event_id for update;
  if previous is null then raise exception 'event_not_found' using errcode = 'P0002'; end if;
  insert into public.moderation_actions(admin_id,target_user_id,action_type,reason,previous_value,new_value)
  values (auth.uid(),actor,'community_event_visibility',trim(p_reason),jsonb_build_object('is_published',previous),jsonb_build_object('is_published',p_visible));
  update public.community_events set is_published=p_visible where id=p_event_id;
end;
$$;

grant execute on function public.admin_adjust_trust_score(uuid,integer,text) to authenticated;
grant execute on function public.admin_set_verification(uuid,text,boolean,text) to authenticated;
grant execute on function public.admin_set_community_event_visibility(uuid,boolean,text) to authenticated;

commit;
