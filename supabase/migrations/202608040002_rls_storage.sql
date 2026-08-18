begin;

alter table public.profiles enable row level security;
alter table public.volunteer_profiles enable row level security;
alter table public.categories enable row level security;
alter table public.volunteer_categories enable row level security;
alter table public.help_requests enable row level security;
alter table public.request_private_details enable row level security;
alter table public.responses enable row level security;
alter table public.assignments enable row level security;
alter table public.reviews enable row level security;
alter table public.bonus_transactions enable row level security;
alter table public.reports enable row level security;
alter table public.achievements enable row level security;
alter table public.volunteer_achievements enable row level security;

create policy profiles_select_self_or_admin on public.profiles for select to authenticated using ((select auth.uid()) = id or (select private.is_admin()));
create policy profiles_update_self_or_admin on public.profiles for update to authenticated using ((select auth.uid()) = id or (select private.is_admin())) with check ((select auth.uid()) = id or (select private.is_admin()));

create policy volunteer_profiles_select_self_or_admin on public.volunteer_profiles for select to authenticated using ((select auth.uid()) = user_id or (select private.is_admin()));
create policy volunteer_profiles_update_self_or_admin on public.volunteer_profiles for update to authenticated using ((select auth.uid()) = user_id or (select private.is_admin())) with check ((select auth.uid()) = user_id or (select private.is_admin()));

create policy categories_public_read on public.categories for select to anon, authenticated using (is_active or (select private.is_admin()));
create policy categories_admin_insert on public.categories for insert to authenticated with check ((select private.is_admin()));
create policy categories_admin_update on public.categories for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy categories_admin_delete on public.categories for delete to authenticated using ((select private.is_admin()));

create policy volunteer_categories_public_read on public.volunteer_categories for select to anon, authenticated using (true);
create policy volunteer_categories_manage_self on public.volunteer_categories for all to authenticated using ((select auth.uid()) = volunteer_id or (select private.is_admin())) with check ((select auth.uid()) = volunteer_id or (select private.is_admin()));

create policy requests_public_read on public.help_requests for select to anon, authenticated using (status in ('open', 'volunteer_selected', 'in_progress', 'awaiting_confirmation', 'completed'));
create policy requests_author_read on public.help_requests for select to authenticated using ((select auth.uid()) = author_id or (select private.is_admin()));
create policy requests_author_insert on public.help_requests for insert to authenticated with check ((select auth.uid()) = author_id and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('requester','admin') and p.status = 'active'));
create policy requests_author_update on public.help_requests for update to authenticated using ((select auth.uid()) = author_id or (select private.is_admin())) with check ((select auth.uid()) = author_id or (select private.is_admin()));

create policy private_details_participant_read on public.request_private_details for select to authenticated using (
  exists(select 1 from public.help_requests r where r.id = request_id and (r.author_id = (select auth.uid()) or r.selected_volunteer_id = (select auth.uid()))) or (select private.is_admin())
);
create policy private_details_author_insert on public.request_private_details for insert to authenticated with check (exists(select 1 from public.help_requests r where r.id = request_id and r.author_id = (select auth.uid())));
create policy private_details_author_update on public.request_private_details for update to authenticated using (exists(select 1 from public.help_requests r where r.id = request_id and r.author_id = (select auth.uid()))) with check (exists(select 1 from public.help_requests r where r.id = request_id and r.author_id = (select auth.uid())));

create policy responses_participant_read on public.responses for select to authenticated using (
  volunteer_id = (select auth.uid()) or exists(select 1 from public.help_requests r where r.id = request_id and r.author_id = (select auth.uid())) or (select private.is_admin())
);
create policy responses_volunteer_insert on public.responses for insert to authenticated with check (
  volunteer_id = (select auth.uid()) and exists(select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'volunteer' and p.status = 'active') and exists(select 1 from public.help_requests r where r.id = request_id and r.status = 'open' and r.author_id <> (select auth.uid()))
);
create policy responses_volunteer_withdraw on public.responses for update to authenticated using (volunteer_id = (select auth.uid()) and status = 'pending') with check (volunteer_id = (select auth.uid()) and status = 'withdrawn');

create policy assignments_participant_read on public.assignments for select to authenticated using (
  volunteer_id = (select auth.uid()) or exists(select 1 from public.help_requests r where r.id = request_id and r.author_id = (select auth.uid())) or (select private.is_admin())
);

create policy reviews_public_read on public.reviews for select to anon, authenticated using (true);

create policy bonus_owner_read on public.bonus_transactions for select to authenticated using (volunteer_id = (select auth.uid()) or (select private.is_admin()));

create policy reports_owner_read on public.reports for select to authenticated using (author_id = (select auth.uid()) or (select private.is_admin()));
create policy reports_owner_insert on public.reports for insert to authenticated with check (author_id = (select auth.uid()));
create policy reports_admin_update on public.reports for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

create policy achievements_public_read on public.achievements for select to anon, authenticated using (true);
create policy achievements_admin_manage on public.achievements for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy volunteer_achievements_owner_read on public.volunteer_achievements for select to authenticated using (volunteer_id = (select auth.uid()) or (select private.is_admin()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 5242880, array['image/jpeg','image/png','image/webp']),
  ('request-images', 'request-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

create policy storage_public_read_images on storage.objects for select to anon, authenticated using (bucket_id in ('avatars','request-images'));
create policy storage_owner_insert_images on storage.objects for insert to authenticated with check (
  bucket_id in ('avatars','request-images') and (storage.foldername(name))[1] = (select auth.uid()::text) and lower(storage.extension(name)) in ('jpg','jpeg','png','webp')
);
create policy storage_owner_update_images on storage.objects for update to authenticated using (owner_id = (select auth.uid()::text)) with check (owner_id = (select auth.uid()::text) and bucket_id in ('avatars','request-images'));
create policy storage_owner_delete_images on storage.objects for delete to authenticated using (owner_id = (select auth.uid()::text));

commit;
