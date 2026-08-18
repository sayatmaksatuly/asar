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
  select role, status into caller_role, caller_status from public.profiles where id = (select auth.uid());
  if caller_role not in ('requester', 'admin') or caller_status <> 'active' then raise exception 'requester_required' using errcode = '42501'; end if;
  if coalesce((p_payload->>'safety_consent')::boolean, false) is not true then raise exception 'safety_consent_required' using errcode = '22023'; end if;
  insert into public.help_requests(author_id,title,description,content_language,category_id,city,district,desired_date,time_from,time_to,urgency,help_format,status,image_url,special_conditions)
  values ((select auth.uid()), p_payload->>'title', p_payload->>'description', (p_payload->>'content_language')::public.app_language, (p_payload->>'category_id')::uuid, p_payload->>'city', p_payload->>'district', nullif(p_payload->>'desired_date','')::date, nullif(p_payload->>'time_from','')::time, nullif(p_payload->>'time_to','')::time, (p_payload->>'urgency')::public.urgency_level, (p_payload->>'help_format')::public.help_format, (p_payload->>'status')::public.request_status, nullif(p_payload->>'image_url',''), nullif(p_payload->>'special_conditions',''))
  returning id into new_id;
  insert into public.request_private_details(request_id,address,location_notes,preferred_contact_method)
  values (new_id, p_payload->>'address', nullif(p_payload->>'location_notes',''), nullif(p_payload->>'preferred_contact_method',''));
  return new_id;
end;
$$;

create or replace function public.select_volunteer(p_request_id uuid, p_response_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  selected_response public.responses%rowtype;
  assignment_id uuid;
begin
  if not exists(select 1 from public.help_requests where id = p_request_id and author_id = (select auth.uid()) and status = 'open') then raise exception 'request_not_selectable' using errcode = '42501'; end if;
  select * into selected_response from public.responses where id = p_response_id and request_id = p_request_id and status = 'pending' for update;
  if not found then raise exception 'response_not_found' using errcode = 'P0002'; end if;
  update public.responses set status = case when id = p_response_id then 'accepted'::public.response_status else 'rejected'::public.response_status end where request_id = p_request_id and status = 'pending';
  insert into public.assignments(request_id, volunteer_id) values (p_request_id, selected_response.volunteer_id) returning id into assignment_id;
  update public.help_requests set selected_volunteer_id = selected_response.volunteer_id, status = 'volunteer_selected' where id = p_request_id;
  return assignment_id;
end;
$$;

create or replace function public.update_help_request(p_request_id uuid, p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public, private
as $$
declare
  current_request public.help_requests%rowtype;
begin
  select * into current_request from public.help_requests where id = p_request_id for update;
  if not found or (current_request.author_id <> (select auth.uid()) and not private.is_admin()) then
    raise exception 'request_update_forbidden' using errcode = '42501';
  end if;
  if current_request.status not in ('draft', 'open') then raise exception 'request_locked' using errcode = '42501'; end if;
  if coalesce((p_payload->>'safety_consent')::boolean, false) is not true then raise exception 'safety_consent_required' using errcode = '22023'; end if;

  update public.help_requests set
    title = p_payload->>'title',
    description = p_payload->>'description',
    content_language = (p_payload->>'content_language')::public.app_language,
    category_id = (p_payload->>'category_id')::uuid,
    city = p_payload->>'city',
    district = p_payload->>'district',
    desired_date = nullif(p_payload->>'desired_date','')::date,
    time_from = nullif(p_payload->>'time_from','')::time,
    time_to = nullif(p_payload->>'time_to','')::time,
    urgency = (p_payload->>'urgency')::public.urgency_level,
    help_format = (p_payload->>'help_format')::public.help_format,
    status = (p_payload->>'status')::public.request_status,
    image_url = nullif(p_payload->>'image_url',''),
    special_conditions = nullif(p_payload->>'special_conditions','')
  where id = p_request_id;

  update public.request_private_details set
    address = p_payload->>'address',
    location_notes = nullif(p_payload->>'location_notes',''),
    preferred_contact_method = nullif(p_payload->>'preferred_contact_method','')
  where request_id = p_request_id;
end;
$$;

create or replace function public.start_assignment(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.assignments%rowtype;
begin
  select * into a from public.assignments where id = p_assignment_id for update;
  if not found or a.volunteer_id <> (select auth.uid()) or a.status <> 'volunteer_selected' then raise exception 'transition_forbidden' using errcode = '42501'; end if;
  update public.assignments set status = 'in_progress', started_at = coalesce(started_at, now()) where id = p_assignment_id;
  update public.help_requests set status = 'in_progress' where id = a.request_id;
end;
$$;

create or replace function public.mark_assignment_done(p_assignment_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare a public.assignments%rowtype;
begin
  select * into a from public.assignments where id = p_assignment_id for update;
  if not found or a.volunteer_id <> (select auth.uid()) or a.status <> 'in_progress' then raise exception 'transition_forbidden' using errcode = '42501'; end if;
  update public.assignments set status = 'awaiting_confirmation', volunteer_completed_at = now() where id = p_assignment_id;
  update public.help_requests set status = 'awaiting_confirmation' where id = a.request_id;
end;
$$;

create or replace function public.confirm_assignment_completion(p_assignment_id uuid)
returns integer language plpgsql security definer set search_path = public as $$
declare
  a public.assignments%rowtype;
  request_urgency public.urgency_level;
  requester_id uuid;
  points integer;
  inserted_points integer;
  completed_count integer;
begin
  select * into a from public.assignments where id = p_assignment_id for update;
  if not found or a.status <> 'awaiting_confirmation' then raise exception 'assignment_not_confirmable' using errcode = '42501'; end if;
  select author_id, urgency into requester_id, request_urgency from public.help_requests where id = a.request_id for update;
  if requester_id <> (select auth.uid()) and not private.is_admin() then raise exception 'confirmation_forbidden' using errcode = '42501'; end if;
  points := case when request_urgency = 'urgent' then 75 else 50 end;
  insert into public.bonus_transactions(volunteer_id, assignment_id, amount, reason, note)
  values (a.volunteer_id, a.id, points, case when request_urgency = 'urgent' then 'urgent_completion'::public.bonus_reason else 'assignment_completion'::public.bonus_reason end, 'Automatic reward after requester confirmation')
  on conflict do nothing returning amount into inserted_points;
  if inserted_points is null then raise exception 'bonus_already_awarded' using errcode = '23505'; end if;
  update public.assignments set status = 'completed', requester_confirmed_at = now() where id = p_assignment_id;
  update public.help_requests set status = 'completed' where id = a.request_id;
  update public.volunteer_profiles set bonus_balance = bonus_balance + points where user_id = a.volunteer_id;
  update public.profiles set completed_tasks_count = completed_tasks_count + 1 where id = a.volunteer_id returning completed_tasks_count into completed_count;
  update public.volunteer_profiles set level = greatest(1, least(20, 1 + completed_count / 5)) where user_id = a.volunteer_id;
  insert into public.volunteer_achievements(volunteer_id, achievement_id)
    select a.volunteer_id, ach.id from public.achievements ach where ach.required_completed_tasks > 0 and completed_count >= ach.required_completed_tasks
    on conflict do nothing;
  return points;
end;
$$;

create or replace function public.submit_review(p_assignment_id uuid, p_rating integer, p_text text default null)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.assignments%rowtype;
  requester_id uuid;
  receiver_id uuid;
  review_id uuid;
  inserted_bonus integer;
begin
  if p_rating not between 1 and 5 then raise exception 'invalid_rating' using errcode = '22023'; end if;
  select * into a from public.assignments where id = p_assignment_id;
  if not found or a.status <> 'completed' then raise exception 'assignment_not_completed' using errcode = '42501'; end if;
  select author_id into requester_id from public.help_requests where id = a.request_id;
  if (select auth.uid()) = requester_id then receiver_id := a.volunteer_id;
  elsif (select auth.uid()) = a.volunteer_id then receiver_id := requester_id;
  else raise exception 'review_forbidden' using errcode = '42501'; end if;
  insert into public.reviews(assignment_id, author_id, receiver_id, rating, text) values (p_assignment_id, (select auth.uid()), receiver_id, p_rating, nullif(trim(p_text), '')) returning id into review_id;
  update public.profiles p set rating = coalesce((select round(avg(r.rating)::numeric, 2) from public.reviews r where r.receiver_id = p.id), 0) where p.id = receiver_id;
  if receiver_id = a.volunteer_id and p_rating >= 4 then
    insert into public.bonus_transactions(volunteer_id, assignment_id, amount, reason, note) values (a.volunteer_id, a.id, 10, 'positive_review', 'Positive requester review') on conflict do nothing returning amount into inserted_bonus;
    if inserted_bonus is not null then update public.volunteer_profiles set bonus_balance = bonus_balance + inserted_bonus where user_id = a.volunteer_id; end if;
  end if;
  return review_id;
end;
$$;

create or replace function public.admin_adjust_bonus(p_volunteer_id uuid, p_amount integer, p_note text)
returns uuid language plpgsql security definer set search_path = public, private as $$
declare transaction_id uuid;
begin
  if not private.is_admin() then raise exception 'admin_required' using errcode = '42501'; end if;
  if p_amount = 0 or abs(p_amount) > 10000 or char_length(trim(p_note)) < 3 then raise exception 'invalid_adjustment' using errcode = '22023'; end if;
  insert into public.bonus_transactions(volunteer_id, amount, reason, note) values (p_volunteer_id, p_amount, 'admin_adjustment', trim(p_note)) returning id into transaction_id;
  update public.volunteer_profiles set bonus_balance = greatest(0, bonus_balance + p_amount) where user_id = p_volunteer_id;
  return transaction_id;
end;
$$;

revoke all on function public.create_help_request(jsonb) from public, anon;
revoke all on function public.select_volunteer(uuid,uuid) from public, anon;
revoke all on function public.update_help_request(uuid,jsonb) from public, anon;
revoke all on function public.start_assignment(uuid) from public, anon;
revoke all on function public.mark_assignment_done(uuid) from public, anon;
revoke all on function public.confirm_assignment_completion(uuid) from public, anon;
revoke all on function public.submit_review(uuid,integer,text) from public, anon;
revoke all on function public.admin_adjust_bonus(uuid,integer,text) from public, anon;
grant execute on function public.create_help_request(jsonb) to authenticated;
grant execute on function public.select_volunteer(uuid,uuid) to authenticated;
grant execute on function public.update_help_request(uuid,jsonb) to authenticated;
grant execute on function public.start_assignment(uuid) to authenticated;
grant execute on function public.mark_assignment_done(uuid) to authenticated;
grant execute on function public.confirm_assignment_completion(uuid) to authenticated;
grant execute on function public.submit_review(uuid,integer,text) to authenticated;
grant execute on function public.admin_adjust_bonus(uuid,integer,text) to authenticated;

commit;
