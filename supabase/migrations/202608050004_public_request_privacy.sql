begin;

-- Keep the public request catalogue useful while respecting profile privacy.
-- The previous base view exposed the full profile name and avatar regardless
-- of the new show_public_name preference.
create or replace view public.public_help_requests with (security_barrier = true) as
select
  r.id,
  r.author_id,
  r.title,
  r.description,
  r.content_language,
  r.category_id,
  c.slug as category_slug,
  c.name_ru as category_name_ru,
  c.name_kk as category_name_kk,
  r.city,
  r.district,
  r.desired_date,
  r.time_from,
  r.time_to,
  r.urgency,
  r.help_format,
  r.status,
  r.image_url,
  r.special_conditions,
  r.created_at,
  (select count(*)::integer
     from public.responses x
    where x.request_id = r.id
      and x.status <> 'withdrawn') as response_count,
  case
    when p.show_public_name then p.full_name
    else concat(left(p.full_name, 1), '.')
  end as author_name,
  p.rating as author_rating,
  case when p.show_public_name then p.avatar_url else null end as author_avatar_url
from public.help_requests r
join public.categories c on c.id = r.category_id
join public.profiles p on p.id = r.author_id
where r.status in ('open', 'volunteer_selected', 'in_progress', 'awaiting_confirmation', 'completed')
  and p.status = 'active';

grant select on public.public_help_requests to anon, authenticated;

commit;
