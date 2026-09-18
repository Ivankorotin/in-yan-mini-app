-- Шаблон для быстрого наполнения тестового участника данными.
--
-- КАК ПОЛЬЗОВАТЬСЯ:
-- 1. Попросите знакомого один раз открыть бота и нажать кнопку меню —
--    это создаст его строку в participants автоматически.
-- 2. Впишите его telegram_id ниже (строка "telegram_id = ...").
-- 3. При желании поправьте тексты недель/заданий/сессии под себя.
-- 4. Выполните весь блок в Supabase → SQL Editor.
-- 5. Попросите знакомого переоткрыть мини-приложение.
--
-- Можно выполнять этот блок несколько раз для разных людей — просто
-- каждый раз меняйте telegram_id и запускайте заново.

do $$
declare
  pid uuid;
begin
  select id into pid from participants where telegram_id = 398223503; -- ← замените на его telegram_id

  if pid is null then
    raise exception 'Участник с таким telegram_id ещё не найден — пусть сначала откроет бота один раз.';
  end if;

  -- Немного контекста в профиль (необязательно, но приятно для теста)
  update participants set
    current_step = 1,
    goal = 'Проверить, как работает практикум',
    professional_request = 'Тестовый запрос — можно менять как угодно'
  where id = pid;

  -- Если для этого участника уже что-то заводили раньше — чистим,
  -- чтобы не плодить дубли при повторном запуске.
  delete from tasks where participant_id = pid;
  delete from route_steps where participant_id = pid;
  delete from sessions where participant_id = pid;

  insert into route_steps (participant_id, step_number, title, status) values
    (pid, 1, 'Установить запрос', 'current'),
    (pid, 2, 'Внедрить изменения', 'future'),
    (pid, 3, 'Скорректировать способ', 'future'),
    (pid, 4, 'Попробовать новое', 'future');

  insert into tasks (participant_id, route_step_id, title, description, allow_text, allow_photos, photo_limit, completed)
  select pid, rs.id, t.title, t.description, t.allow_text, t.allow_photos, t.photo_limit, false
  from route_steps rs
  cross join (values
    ('Для чего тебе твой отношения?', 'Выпиши 7-10 потребностей в твоих отношениях', true, false, 0),
    ('Зафиксируй потребности, которые удовлятворяются', 'Напиши из вопроса выше те потребности, которые в твоих отношениях удовлетворяются.', true, true, 3)
  ) as t(title, description, allow_text, allow_photos, photo_limit)
  where rs.participant_id = pid and rs.step_number = 1;

  insert into sessions (participant_id, session_number, session_date, session_time, zoom_url) values
    (pid, 1, current_date + 2, '19:00', 'https://zoom.us/j/example');

  raise notice 'Готово: участнику % заведён маршрут из 4 недель, 2 задания и ближайшая сессия.', pid;
end $$;
