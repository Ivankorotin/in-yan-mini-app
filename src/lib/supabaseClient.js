import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

// Пока переменные окружения не заданы (например, при первом запуске
// после клонирования репозитория), приложение не должно падать —
// просто работаем на моковых данных из App.jsx, как раньше.
export const supabase = url && key ? createClient(url, key) : null

if (!supabase) {
  console.warn(
    '[in-yan] Supabase не настроен: заполните .env (см. .env.example). ' +
    'Приложение работает на локальных моковых данных без сохранения.'
  )
}
