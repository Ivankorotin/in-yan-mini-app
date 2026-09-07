-- Этот файл НЕ создаёт таблицы — они у вас уже есть в Supabase
-- (participants, route_steps, sessions, tasks, task_submissions,
-- task_photos, materials, reflections). Он только включает Row Level
-- Security и добавляет политики "каждый видит только своё".
--
-- Выполните целиком в Supabase: SQL Editor → New query → Run.
-- Безопасно запускать повторно — старые политики с теми же именами
-- пересоздаются, а не дублируются.

-- ============================================================
-- Row Level Security
-- ============================================================
-- auth.uid() появляется только после того, как Edge Function
-- supabase/functions/telegram-auth проверит подпись initData от
-- Telegram и выдаст токен (см. src/lib/telegramAuth.js). Без токена
-- auth.uid() равен null, и ни одна политика ниже не совпадёт —
-- анонимный доступ к чужим данным закрыт.

alter table participants enable row level security;
alter table route_steps enable row level security;
alter table sessions enable row level security;
alter table tasks enable row level security;
alter table task_submissions enable row level security;
alter table task_photos enable row level security;
alter table materials enable row level security;
alter table reflections enable row level security;

drop policy if exists "participants: select own" on participants;
create policy "participants: select own" on participants
  for select using (id = auth.uid());

drop policy if exists "route_steps: select own" on route_steps;
create policy "route_steps: select own" on route_steps
  for select using (participant_id = auth.uid());

drop policy if exists "sessions: select own" on sessions;
create policy "sessions: select own" on sessions
  for select using (participant_id = auth.uid());

drop policy if exists "tasks: select own" on tasks;
create policy "tasks: select own" on tasks
  for select using (participant_id = auth.uid());

drop policy if exists "tasks: update own" on tasks;
create policy "tasks: update own" on tasks
  for update using (participant_id = auth.uid());

drop policy if exists "task_submissions: select own" on task_submissions;
create policy "task_submissions: select own" on task_submissions
  for select using (participant_id = auth.uid());

drop policy if exists "task_submissions: insert own" on task_submissions;
create policy "task_submissions: insert own" on task_submissions
  for insert with check (participant_id = auth.uid());

drop policy if exists "task_submissions: update own" on task_submissions;
create policy "task_submissions: update own" on task_submissions
  for update using (participant_id = auth.uid());
-- ВАЖНО: это разрешает клиенту править и text_answer, и
-- psychologist_comment в одной и той же строке (RLS работает на
-- уровне строк, не колонок). Если хотите закрыть клиенту доступ на
-- запись именно к psychologist_comment — скажите, добавим отдельную
-- функцию/триггер для этого поля.

drop policy if exists "task_photos: select own" on task_photos;
create policy "task_photos: select own" on task_photos
  for select using (
    exists (
      select 1 from task_submissions
      where task_submissions.id = task_photos.submission_id
      and task_submissions.participant_id = auth.uid()
    )
  );

drop policy if exists "task_photos: insert own" on task_photos;
create policy "task_photos: insert own" on task_photos
  for insert with check (
    exists (
      select 1 from task_submissions
      where task_submissions.id = task_photos.submission_id
      and task_submissions.participant_id = auth.uid()
    )
  );

drop policy if exists "materials: select own" on materials;
create policy "materials: select own" on materials
  for select using (participant_id = auth.uid());

drop policy if exists "reflections: select own" on reflections;
create policy "reflections: select own" on reflections
  for select using (participant_id = auth.uid());

drop policy if exists "reflections: insert own" on reflections;
create policy "reflections: insert own" on reflections
  for insert with check (participant_id = auth.uid());

drop policy if exists "reflections: update own" on reflections;
create policy "reflections: update own" on reflections
  for update using (participant_id = auth.uid());

-- Заводить новых участников может только сама Edge Function (через
-- service_role key, который не подчиняется RLS вообще) — отдельная
-- policy на insert в participants с фронтенда намеренно не создаётся.

-- ============================================================
-- Хранилище для фото к заданиям
-- ============================================================
insert into storage.buckets (id, name, public)
values ('task-photos', 'task-photos', false)
on conflict (id) do nothing;

-- Путь к файлу — "{task_id}/{имя файла}" (см. src/lib/api.js),
-- поэтому первый компонент пути можно сверить с задачей участника
-- напрямую через tasks.participant_id.
drop policy if exists "task-photos: select own" on storage.objects;
create policy "task-photos: select own" on storage.objects
  for select using (
    bucket_id = 'task-photos'
    and exists (
      select 1 from tasks
      where tasks.id::text = (storage.foldername(name))[1]
      and tasks.participant_id = auth.uid()
    )
  );

drop policy if exists "task-photos: insert own" on storage.objects;
create policy "task-photos: insert own" on storage.objects
  for insert with check (
    bucket_id = 'task-photos'
    and exists (
      select 1 from tasks
      where tasks.id::text = (storage.foldername(name))[1]
      and tasks.participant_id = auth.uid()
    )
  );
