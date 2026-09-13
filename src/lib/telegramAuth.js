import { createClient } from '@supabase/supabase-js'
import { supabase, setAuthedClient } from './supabaseClient'
import { getRawInitData } from './telegram'

// Вызывается один раз при загрузке приложения. Если всё в порядке —
// дальше все запросы к Supabase идут от имени проверенного клиента,
// и Row Level Security пускает его только к его собственным данным.
//
// Возвращает { participantId, reason, message } — participantId есть
// только при reason === 'ok'. reason/message нужны для диагностики
// на экране, без них сложно понять, на каком шаге что-то пошло не так.
//
// Вызываем функцию через обычный fetch (а не supabase.functions.invoke) —
// так мы видим настоящий HTTP-статус и текст ответа сервера, а не
// обобщённое "non-2xx status code" от библиотеки.
export async function authenticateWithTelegram() {
  if (!supabase) return { participantId: null, reason: 'no-supabase' }

  const initData = getRawInitData()
  if (!initData) {
    console.warn('[in-yan] Нет initData — похоже, приложение открыто не через Telegram.')
    return { participantId: null, reason: 'no-init-data' }
  }

  const rawUrl = import.meta.env.VITE_SUPABASE_URL || ''
  const url = rawUrl.replace(/\/+$/, '') // убираем случайный "/" в конце — иначе путь ломается
  const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
  const functionUrl = `${url}/functions/v1/telegram-auth`

  let response
  try {
    response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${anonKey}`,
        apikey: anonKey,
      },
      body: JSON.stringify({ initData }),
    })
  } catch (networkErr) {
    console.error('[in-yan] Сетевая ошибка при вызове telegram-auth:', networkErr)
    return { participantId: null, reason: 'function-error', message: `сеть (${functionUrl}): ${networkErr.message}` }
  }

  const rawText = await response.text()
  let data = null
  try {
    data = JSON.parse(rawText)
  } catch {
    /* ответ не JSON — покажем как есть ниже */
  }

  if (!response.ok || !data?.token) {
    console.error('[in-yan] Проверка Telegram не прошла:', response.status, rawText)
    const message = `HTTP ${response.status} на ${functionUrl} — ${data?.message || data?.error || rawText || 'пустой ответ'}`
    return { participantId: null, reason: 'function-error', message }
  }

  const authedClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${data.token}` } },
  })

  setAuthedClient(authedClient)
  return { participantId: data.client_id, reason: 'ok' }
}
