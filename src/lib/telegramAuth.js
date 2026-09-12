import { createClient } from '@supabase/supabase-js'
import { supabase, setAuthedClient } from './supabaseClient'
import { getRawInitData } from './telegram'

// Вызывается один раз при загрузке приложения. Если всё в порядке —
// дальше все запросы к Supabase идут от имени проверенного клиента,
// и Row Level Security пускает его только к его собственным данным.
//
// Возвращает { participantId, reason } — participantId есть только
// при reason === 'ok'. reason нужен для диагностики на экране,
// без него сложно понять, на каком шаге что-то пошло не так.
export async function authenticateWithTelegram() {
  if (!supabase) return { participantId: null, reason: 'no-supabase' }

  const initData = getRawInitData()
  if (!initData) {
    console.warn('[in-yan] Нет initData — похоже, приложение открыто не через Telegram.')
    return { participantId: null, reason: 'no-init-data' }
  }

  const { data, error } = await supabase.functions.invoke('telegram-auth', {
    body: { initData },
  })

  if (error || !data?.token) {
    console.error('[in-yan] Проверка Telegram не прошла:', error || data)
    const message = error?.message || data?.error || 'неизвестная ошибка'
    return { participantId: null, reason: 'function-error', message }
  }

  const url = import.meta.env.VITE_SUPABASE_URL
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const authedClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.token}` } },
  })

  setAuthedClient(authedClient)
  return { participantId: data.client_id, reason: 'ok' }
}
