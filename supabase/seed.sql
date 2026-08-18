-- ASAR demo dataset. Every identity, address and phone-like note is fictional.
-- Local demo password for every account: AsarDemo123!

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
  raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
  confirmation_token, recovery_token, email_change, email_change_token_new
)
values
  ('00000000-0000-0000-0000-000000000000', '11111111-1111-4111-8111-111111111111', 'authenticated', 'authenticated', 'aida.requester@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Айда Сәрсен","role":"requester","preferred_language":"kk"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '22222222-2222-4222-8222-222222222222', 'authenticated', 'authenticated', 'serik.requester@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Серик Нуров","role":"requester","preferred_language":"ru"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', '33333333-3333-4333-8333-333333333333', 'authenticated', 'authenticated', 'admin@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Модератор ASAR","role":"requester","preferred_language":"ru"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'authenticated', 'authenticated', 'volunteer.one@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Алия Бек","role":"volunteer","preferred_language":"ru"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'authenticated', 'authenticated', 'volunteer.two@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Нұрлан Әли","role":"volunteer","preferred_language":"kk"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'authenticated', 'authenticated', 'volunteer.three@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Мария Ли","role":"volunteer","preferred_language":"ru"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'authenticated', 'authenticated', 'volunteer.four@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Данияр Омар","role":"volunteer","preferred_language":"kk"}', now(), now(), '', '', '', ''),
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'authenticated', 'authenticated', 'volunteer.five@example.invalid', extensions.crypt('AsarDemo123!', extensions.gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"Елена Пак","role":"volunteer","preferred_language":"ru"}', now(), now(), '', '', '', '')
on conflict (id) do nothing;

insert into auth.identities (
  id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
)
select id, id, email,
  jsonb_build_object('sub', id::text, 'email', email, 'email_verified', true),
  'email', now(), now(), now()
from auth.users
where email like '%@example.invalid'
on conflict (provider_id, provider) do nothing;

update public.profiles
set
  role = case
    when id = '33333333-3333-4333-8333-333333333333' then 'admin'::public.user_role
    when id::text like 'aaaaaaaa-%' then 'volunteer'::public.user_role
    else 'requester'::public.user_role
  end,
  onboarding_step = 5,
  onboarding_completed_at = coalesce(onboarding_completed_at, now() - interval '90 days'),
  email_verified = true,
  phone_verified = id::text like 'aaaaaaaa-%',
  identity_verified = id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2'),
  community_verified = id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  show_public_name = id::text like 'aaaaaaaa-%',
  city = 'Алматы',
  district = case
    when id in ('11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1') then 'Алмалинский'
    when id in ('22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2') then 'Бостандыкский'
    else 'Медеуский'
  end,
  completed_tasks_count = case
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then 18
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then 9
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' then 6
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4' then 3
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5' then 1
    else completed_tasks_count
  end,
  rating = case
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then 4.90
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then 4.80
    when id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' then 4.70
    when id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5') then 5.00
    else rating
  end
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
);

insert into public.volunteer_profiles(user_id)
select id from public.profiles where id::text like 'aaaaaaaa-%'
on conflict (user_id) do nothing;

update public.volunteer_profiles
set
  bio = 'Готов(а) помогать соседям в свободное время.',
  availability = 'Будни после 18:00, выходные по договорённости',
  verification_status = 'verified',
  bonus_balance = case
    when user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then 420
    when user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2' then 230
    when user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3' then 160
    else 50
  end,
  level = case
    when user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1' then 4
    when user_id in ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3') then 2
    else 1
  end
where user_id in (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5'
);

insert into public.categories (id, slug, name_ru, name_kk, description_ru, description_kk, icon, sort_order)
values
  ('c0000000-0000-4000-8000-000000000001', 'products', 'Продукты и покупки', 'Азық-түлік және сатып алу', 'Купить и доставить необходимое', 'Қажетті затты сатып алып, жеткізу', 'shopping-basket', 10),
  ('c0000000-0000-4000-8000-000000000002', 'transport', 'Транспорт', 'Көлік', 'Подвезти человека или вещи', 'Адамды немесе заттарды жеткізу', 'car', 20),
  ('c0000000-0000-4000-8000-000000000003', 'household', 'Помощь по дому', 'Үй шаруасына көмек', 'Небольшие бытовые задачи', 'Шағын тұрмыстық істер', 'home', 30),
  ('c0000000-0000-4000-8000-000000000004', 'companionship', 'Сопровождение', 'Еріп жүру', 'Сходить вместе в учреждение', 'Мекемеге бірге бару', 'accessibility', 40),
  ('c0000000-0000-4000-8000-000000000005', 'digital', 'Цифровая помощь', 'Цифрлық көмек', 'Телефон, приложения и документы', 'Телефон, қосымшалар және құжаттар', 'smartphone', 50),
  ('c0000000-0000-4000-8000-000000000006', 'families', 'Помощь семьям', 'Отбасыларға көмек', 'Поддержка родителей и детей', 'Ата-аналар мен балаларды қолдау', 'baby', 60),
  ('c0000000-0000-4000-8000-000000000007', 'animals', 'Забота о животных', 'Жануарларға қамқорлық', 'Покормить или выгулять питомца', 'Үй жануарын тамақтандыру не серуендету', 'paw-print', 70),
  ('c0000000-0000-4000-8000-000000000008', 'education', 'Учёба', 'Оқу', 'Объяснить тему или помочь с языком', 'Тақырыпты түсіндіру не тілге көмектесу', 'book-open', 80),
  ('c0000000-0000-4000-8000-000000000009', 'wellbeing', 'Здоровье и быт', 'Денсаулық және тұрмыс', 'Только немедицинская бытовая поддержка', 'Тек медициналық емес тұрмыстық қолдау', 'heart-pulse', 90),
  ('c0000000-0000-4000-8000-000000000010', 'repair', 'Мелкий ремонт', 'Ұсақ жөндеу', 'Безопасные несложные работы', 'Қауіпсіз, жеңіл жөндеу жұмыстары', 'wrench', 100),
  ('c0000000-0000-4000-8000-000000000011', 'other', 'Другое', 'Басқа', 'Другие добрые соседские дела', 'Басқа да ізгі көршілік істер', 'sparkles', 110)
on conflict (id) do update set
  name_ru = excluded.name_ru,
  name_kk = excluded.name_kk,
  description_ru = excluded.description_ru,
  description_kk = excluded.description_kk,
  icon = excluded.icon,
  sort_order = excluded.sort_order;

insert into public.volunteer_categories (volunteer_id, category_id)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'c0000000-0000-4000-8000-000000000001'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'c0000000-0000-4000-8000-000000000002'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'c0000000-0000-4000-8000-000000000004'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'c0000000-0000-4000-8000-000000000009'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'c0000000-0000-4000-8000-000000000005'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'c0000000-0000-4000-8000-000000000003'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'c0000000-0000-4000-8000-000000000010'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'c0000000-0000-4000-8000-000000000007')
on conflict do nothing;

insert into public.help_requests (
  id, author_id, title, description, content_language, category_id, city, district,
  desired_date, time_from, time_to, urgency, help_format, status, selected_volunteer_id, created_at
)
values
  ('b0000000-0000-4000-8000-000000000001', '11111111-1111-4111-8111-111111111111', 'Помочь купить продукты', 'Нужно купить продукты по короткому списку и принести к подъезду.', 'ru', 'c0000000-0000-4000-8000-000000000001', 'Алматы', 'Алмалинский', current_date + 1, '10:00', '12:00', 'normal', 'delivery', 'open', null, now() - interval '2 hours'),
  ('b0000000-0000-4000-8000-000000000002', '22222222-2222-4222-8222-222222222222', 'ХҚКО-ға бірге бару', 'ХҚКО-ға барып-қайтуға байсалды серік керек.', 'kk', 'c0000000-0000-4000-8000-000000000004', 'Алматы', 'Бостандыкский', current_date + 2, '14:00', '16:00', 'normal', 'in_person', 'open', null, now() - interval '5 hours'),
  ('b0000000-0000-4000-8000-000000000003', '11111111-1111-4111-8111-111111111111', 'Настроить видеосвязь', 'Помочь установить приложение и показать, как звонить семье.', 'ru', 'c0000000-0000-4000-8000-000000000005', 'Алматы', 'Алмалинский', current_date + 3, '18:00', '20:00', 'normal', 'in_person', 'open', null, now() - interval '1 day'),
  ('b0000000-0000-4000-8000-000000000004', '22222222-2222-4222-8222-222222222222', 'Кешке итті серуендету', 'Осы аптада үйден шығу қиын, итті 30 минут серуендету қажет.', 'kk', 'c0000000-0000-4000-8000-000000000007', 'Алматы', 'Медеуский', current_date, '19:00', '20:00', 'urgent', 'in_person', 'open', null, now() - interval '30 minutes'),
  ('b0000000-0000-4000-8000-000000000005', '11111111-1111-4111-8111-111111111111', 'Қазақ тілінде сөйлесу тәжірибесі', 'Қарапайым сөйлесу тәжірибесіне бір сағатқа сұхбаттас адам іздеймін.', 'kk', 'c0000000-0000-4000-8000-000000000008', 'Алматы', 'Бостандыкский', current_date + 4, '16:00', '17:00', 'low', 'in_person', 'open', null, now() - interval '2 days'),
  ('b0000000-0000-4000-8000-000000000006', '22222222-2222-4222-8222-222222222222', 'Закрепить дверную ручку', 'Нужно подтянуть крепления обычной межкомнатной ручки.', 'ru', 'c0000000-0000-4000-8000-000000000010', 'Алматы', 'Бостандыкский', current_date + 1, '11:00', '13:00', 'normal', 'in_person', 'in_progress', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', now() - interval '3 days'),
  ('b0000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'Отвезти коробки в пункт сбора', 'Три лёгкие коробки с книгами, они поместятся в обычный багажник.', 'ru', 'c0000000-0000-4000-8000-000000000002', 'Алматы', 'Алмалинский', current_date - 6, '12:00', '14:00', 'normal', 'transport', 'completed', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', now() - interval '8 days'),
  ('b0000000-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'Дәріханадан тапсырысты әкелу', 'Алдын ала төленген тапсырысты алып, кіреберісте беру керек.', 'kk', 'c0000000-0000-4000-8000-000000000009', 'Алматы', 'Медеуский', current_date - 2, '15:00', '16:00', 'urgent', 'delivery', 'completed', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', now() - interval '4 days')
on conflict (id) do nothing;

insert into public.request_private_details (request_id, address, location_notes, preferred_contact_method)
values
  ('b0000000-0000-4000-8000-000000000001', 'Демо-адрес 1', 'Рядом с парком', 'Написать перед приездом'),
  ('b0000000-0000-4000-8000-000000000002', 'Демо-адрес 2', 'Улица Тимирязева', 'Предпочтительнее звонок'),
  ('b0000000-0000-4000-8000-000000000003', 'Демо-адрес 3', 'Около школы', null),
  ('b0000000-0000-4000-8000-000000000004', 'Демо-адрес 4', 'Недалеко от стадиона', null),
  ('b0000000-0000-4000-8000-000000000005', 'Демо-адрес 5', 'Городская библиотека', null),
  ('b0000000-0000-4000-8000-000000000006', 'Демо-адрес 6', 'Рядом с ботаническим садом', 'Домофон не работает'),
  ('b0000000-0000-4000-8000-000000000007', 'Демо-адрес 7', 'Рядом с театром', null),
  ('b0000000-0000-4000-8000-000000000008', 'Демо-адрес 8', 'Проспект Достык', null)
on conflict (request_id) do nothing;

insert into public.responses (id, request_id, volunteer_id, message, status, created_at)
values
  ('d0000000-0000-4000-8000-000000000001', 'b0000000-0000-4000-8000-000000000001', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Могу помочь завтра утром и привезти всё к подъезду.', 'pending', now() - interval '1 hour'),
  ('d0000000-0000-4000-8000-000000000002', 'b0000000-0000-4000-8000-000000000002', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Жақын жерде тұрамын, бірге барып қайта аламын.', 'pending', now() - interval '3 hours'),
  ('d0000000-0000-4000-8000-000000000003', 'b0000000-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'Есть подходящие инструменты, могу аккуратно закрепить ручку.', 'accepted', now() - interval '2 days'),
  ('d0000000-0000-4000-8000-000000000004', 'b0000000-0000-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'Заберу коробки на машине и передам сотрудникам пункта.', 'accepted', now() - interval '7 days'),
  ('d0000000-0000-4000-8000-000000000005', 'b0000000-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'Тапсырысты бүгін алып, кіреберіске жеткізе аламын.', 'accepted', now() - interval '3 days')
on conflict (id) do nothing;

insert into public.assignments (
  id, request_id, volunteer_id, started_at, volunteer_completed_at,
  requester_confirmed_at, status, created_at
)
values
  ('e0000000-0000-4000-8000-000000000006', 'b0000000-0000-4000-8000-000000000006', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', now() - interval '1 day', null, null, 'in_progress', now() - interval '2 days'),
  ('e0000000-0000-4000-8000-000000000007', 'b0000000-0000-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', now() - interval '7 days', now() - interval '6 days', now() - interval '6 days', 'completed', now() - interval '7 days'),
  ('e0000000-0000-4000-8000-000000000008', 'b0000000-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', now() - interval '3 days', now() - interval '2 days', now() - interval '2 days', 'completed', now() - interval '3 days')
on conflict (id) do nothing;

insert into public.reviews (id, assignment_id, author_id, receiver_id, rating, text, created_at)
values
  ('f0000000-0000-4000-8000-000000000007', 'e0000000-0000-4000-8000-000000000007', '11111111-1111-4111-8111-111111111111', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 5, 'Всё вовремя и очень бережно.', now() - interval '5 days'),
  ('f0000000-0000-4000-8000-000000000008', 'e0000000-0000-4000-8000-000000000008', '22222222-2222-4222-8222-222222222222', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 5, 'Жылдам көмек үшін көп рақмет.', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.bonus_transactions (id, volunteer_id, assignment_id, amount, reason, note, created_at)
values
  ('ba000000-0000-4000-8000-000000000007', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'e0000000-0000-4000-8000-000000000007', 50, 'assignment_completion', 'Бонус за выполненную просьбу', now() - interval '6 days'),
  ('ba000000-0000-4000-8000-000000000008', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'e0000000-0000-4000-8000-000000000008', 75, 'urgent_completion', 'Бонус за срочную просьбу', now() - interval '2 days'),
  ('ba000000-0000-4000-8000-000000000009', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'e0000000-0000-4000-8000-000000000008', 10, 'positive_review', 'Бонус за положительный отзыв', now() - interval '1 day')
on conflict (id) do nothing;

insert into public.achievements (
  id, slug, name_ru, name_kk, description_ru, description_kk, icon, required_completed_tasks
)
values
  ('ac000000-0000-4000-8000-000000000001', 'first-help', 'Первая помощь', 'Алғашқы көмек', 'Первая подтверждённая помощь', 'Алғашқы расталған көмек', 'sprout', 1),
  ('ac000000-0000-4000-8000-000000000002', 'five-good-deeds', 'Пять добрых дел', 'Бес ізгі іс', 'Пять подтверждённых помощей', 'Расталған бес көмек', 'heart', 5),
  ('ac000000-0000-4000-8000-000000000003', 'community-hero', 'Герой сообщества', 'Қауымдастық қаһарманы', 'Двадцать подтверждённых помощей', 'Расталған жиырма көмек', 'award', 20),
  ('ac000000-0000-4000-8000-000000000004', 'trusted-neighbor', 'Надёжный сосед', 'Сенімді көрші', 'Профиль доверия достиг уровня «Надёжный»', 'Сенім профилі «Сенімді» деңгейіне жетті', 'shield-check', 3),
  ('ac000000-0000-4000-8000-000000000005', 'medicine-delivery', 'Доставка лекарств', 'Дәрі жеткізу', 'Помощь с безопасной доставкой из аптеки', 'Дәріханадан қауіпсіз жеткізуге көмектесу', 'heart-pulse', 2),
  ('ac000000-0000-4000-8000-000000000006', 'digital-helper', 'Цифровой помощник', 'Цифрлық көмекші', 'Помощь с технологиями', 'Технология бойынша көмек', 'smartphone', 3),
  ('ac000000-0000-4000-8000-000000000007', 'one-month-active', 'Месяц участия', 'Бір ай бірге', 'Месяц устойчивого участия', 'Бір ай тұрақты қатысу', 'calendar-heart', 5),
  ('ac000000-0000-4000-8000-000000000008', 'five-star-helper', 'Помощь на отлично', 'Үздік көмек', 'Три положительных отзыва', 'Үш оң пікір', 'star', 3),
  ('ac000000-0000-4000-8000-000000000009', 'multi-city-supporter', 'Поддержка без границ', 'Шекарасыз қолдау', 'Помощь в нескольких городах', 'Бірнеше қалада көмек', 'map', 10),
  ('ac000000-0000-4000-8000-000000000010', 'community-verified', 'Подтверждён сообществом', 'Қауымдастық растаған', 'Особый знак устойчивого доверия', 'Тұрақты сенімнің ерекше белгісі', 'badge-check', 20)
on conflict (id) do update set
  name_ru = excluded.name_ru,
  name_kk = excluded.name_kk,
  description_ru = excluded.description_ru,
  description_kk = excluded.description_kk,
  required_completed_tasks = excluded.required_completed_tasks;

insert into public.volunteer_achievements (volunteer_id, achievement_id, awarded_at)
values
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'ac000000-0000-4000-8000-000000000001', now() - interval '40 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1', 'ac000000-0000-4000-8000-000000000002', now() - interval '20 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'ac000000-0000-4000-8000-000000000001', now() - interval '30 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa2', 'ac000000-0000-4000-8000-000000000002', now() - interval '10 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'ac000000-0000-4000-8000-000000000001', now() - interval '25 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa3', 'ac000000-0000-4000-8000-000000000002', now() - interval '5 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa4', 'ac000000-0000-4000-8000-000000000001', now() - interval '15 days'),
  ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa5', 'ac000000-0000-4000-8000-000000000001', now() - interval '3 days')
on conflict do nothing;

update public.assignments set help_minutes = case
  when id = 'e0000000-0000-4000-8000-000000000007' then 75
  when id = 'e0000000-0000-4000-8000-000000000008' then 55
  else help_minutes
end;

insert into public.reputation_ledger(user_id, points, reason, source_type, source_id, created_at)
select volunteer_id, 100, 'completed_help', 'assignment', id, coalesce(requester_confirmed_at, created_at)
from public.assignments where status = 'completed'
on conflict do nothing;

insert into public.community_events(event_type, actor_id, target_type, target_id, city, category_slug, is_anonymous, occurred_at)
select 'help_completed', a.volunteer_id, 'assignment', a.id, r.city, c.slug, false, coalesce(a.requester_confirmed_at, a.created_at)
from public.assignments a
join public.help_requests r on r.id = a.request_id
join public.categories c on c.id = r.category_id
where a.status = 'completed'
on conflict do nothing;

select public.recalculate_reputation(id) from public.profiles where role = 'volunteer';
select public.refresh_achievement_progress(id) from public.profiles where role = 'volunteer';
select public.recalculate_trust_score(id) from public.profiles;
