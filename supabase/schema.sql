-- Выполните этот файл в Supabase: SQL Editor → New query → Run.
-- Схема повторяет структуру данных, которая уже используется в App.jsx.

create extension if not exists "pgcrypto";

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  telegram_id text unique not null,
  name text not null default 'Клиент',
  age int,
  goal text default '',
  professional_request text default 'Будет определён вместе с психологом',
  current_week int not null default 1,
  next_session_at timestamptz,
  next_session_format text default 'Онлайн • Zoom',
  next_session_link text,
  created_at timestamptz default now()
);

create table if not exists weeks (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  number int not null,
  title text not null,
  description text default '',
  status text not null default 'future', -- completed | current | future
  unique (client_id, number)
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  week_id uuid not null references weeks(id) on delete cascade,
  title text not null,
  description text default '',
  allow_text boolean not null default true,
  allow_photos boolean not null default false,
  completed boolean not null default false,
  answer text default '',
  sort_order int default 0
);

create table if not exists task_photos (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  storage_path text not null,
  created_at timestamptz default now()
);

create table if not exists materials (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  session_label text not null,   -- "Сессия 1"
  session_date text not null,    -- "3 сентября" (текстом, как в интерфейсе)
  title text not null,
  type text default 'Документ',  -- PDF | Документ | Видео | Изображение...
  url text,
  sort_order int default 0
);

create table if not exists reflections (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients(id) on delete cascade,
  entry_date date not null,
  mood int,       -- 1..5
  resource int,   -- 0..4
  factor text,
  comment text default '',
  unique (client_id, entry_date)
);

-- ============================================================
-- Row Level Security
-- ============================================================
-- ВАЖНО: на этом этапе политики разрешают чтение/запись всем,
-- у кого есть anon-ключ (то есть любому, кто открыл мини-приложение).
-- Это нормально для MVP с непубличной ссылкой, но не защищает от
-- подмены telegram_id на стороне клиента.
--
-- Перед боевым запуском стоит добавить Supabase Edge Function,
-- которая проверяет initData (как мы обсуждали для Express-варианта:
-- HMAC-SHA256 подписи Telegram) и уже после этого выдаёт доступ —
-- я могу собрать её отдельно, когда дойдём до этого шага.

alter table clients enable row level security;
alter table weeks enable row level security;
alter table tasks enable row level security;
alter table task_photos enable row level security;
alter table materials enable row level security;
alter table reflections enable row level security;

create policy "allow all (mvp)" on clients for all using (true) with check (true);
create policy "allow all (mvp)" on weeks for all using (true) with check (true);
create policy "allow all (mvp)" on tasks for all using (true) with check (true);
create policy "allow all (mvp)" on task_photos for all using (true) with check (true);
create policy "allow all (mvp)" on materials for all using (true) with check (true);
create policy "allow all (mvp)" on reflections for all using (true) with check (true);

-- ============================================================
-- Хранилище для фото к заданиям
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

-- ============================================================
-- Пример данных для клиента "Анна" — под тот же сценарий,
-- что уже был в моковых данных App.jsx.
-- Замените telegram_id на реальный id клиента перед использованием.
-- ============================================================
insert into clients (telegram_id, name, age, goal, current_week, next_session_at, next_session_link)
values ('000000', 'Анна', 32, 'Стать ближе к партнёру', 2, '2026-09-10 19:00+03', null)
on conflict (telegram_id) do nothing;

with c as (select id from clients where telegram_id = '000000')
insert into weeks (client_id, number, title, description, status)
select c.id, w.number, w.title, w.description, w.status
from c, (values
  (1, 'Заметить себя', 'Разбираемся, что происходит сейчас', 'completed'),
  (2, 'Услышать себя', 'Исследуем чувства, потребности и желания', 'current'),
  (3, 'Изменить привычное', 'Пробуем новые способы взаимодействия', 'future'),
  (4, 'Закрепить изменения', 'Сохраняем то, что получилось', 'future')
) as w(number, title, description, status)
on conflict (client_id, number) do nothing;

with w2 as (
  select weeks.id from weeks
  join clients on clients.id = weeks.client_id
  where clients.telegram_id = '000000' and weeks.number = 2
)
insert into tasks (week_id, title, description, allow_text, allow_photos, sort_order)
select w2.id, t.title, t.description, true, t.allow_photos, t.sort_order
from w2, (values
  ('Что происходит в наших отношениях сейчас?', 'Опиши несколько ситуаций, в которых особенно сильно чувствуешь дистанцию с партнёром.', true, 0),
  ('Замечаем свои потребности', 'Напиши, чего тебе сейчас больше всего хочется получать от отношений.', false, 1)
) as t(title, description, allow_photos, sort_order);

with c as (select id from clients where telegram_id = '000000')
insert into materials (client_id, session_label, session_date, title, type, sort_order)
select c.id, m.session_label, m.session_date, m.title, m.type, m.sort_order
from c, (values
  ('Сессия 1', '3 сентября', 'Материал после первой сессии', 'PDF', 0),
  ('Сессия 2', '10 сентября', 'Рекомендации после сессии', 'Документ', 1)
) as m(session_label, session_date, title, type, sort_order);
