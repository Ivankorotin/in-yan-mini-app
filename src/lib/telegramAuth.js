import { createClient } from '@supabase/supabase-js'
import { supabase, setAuthedClient } from './supabaseClient'
import { getRawInitData } from './telegram'

// Вызывается один раз при загрузке приложения. Если всё в порядке —
// дальше все запросы к Supabase идут от имени проверенного клиента,
// и Row Level Security пускает его только к его собственным данным.
//
// Возвращает telegram_id проверенного пользователя или null, если
// проверка невозможна (нет Supabase, initData, или сервер её отклонил) —
// в этом случае приложение остаётся на локальных моковых данных.
export async function authenticateWithTelegram() {
  if (!supabase) return null

  const initData = getRawInitData()
  if (!initData) {
    console.warn('[in-yan] Нет initData — похоже, приложение открыто не через Telegram.')
    return null
  }

  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { initData },
  })

  if (error || !data?.token) {
    console.error('[in-yan] Проверка Telegram не прошла:', error || data)
    return null
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const authedClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.token}` } },
  })

  setAuthedClient(authedClient)
  return data.client_id
}
