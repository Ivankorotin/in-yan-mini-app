// Supabase Edge Function: telegram-auth
//
// Что делает:
// 1. Принимает initData, которую Telegram даёт мини-приложению.
// 2. Проверяет её подпись (HMAC-SHA256) с помощью токена бота —
//    так сервер убеждается, что запрос действительно от Telegram,
//    а не подделан в браузере.
// 3. Заводит (или находит) участника в таблице participants.
// 4. Выдаёт JWT, подписанный тем же секретом, что и сам Supabase —
//    дальше фронтенд ходит в базу с этим токеном, и Row Level
//    Security пускает его только к его собственным данным.
//
// Деплой и переменные окружения — см. README.md в корне проекта.

import { create, getNumericDate } from 'https://deno.land/x/djwt@v3.0.2/mod.ts'

const BOT_TOKEN = Deno.env.get('TELEGRAM_BOT_TOKEN')!
const JWT_SECRET = Deno.env.get('SUPABASE_JWT_SECRET')!
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function hmacSha256(key: string | Uint8Array, message: string): Promise<Uint8Array> {
  const keyBytes = typeof key === 'string' ? new TextEncoder().encode(key) : key
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )
  const signature = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(message))
  return new Uint8Array(signature)
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function verifyInitData(initData: string): Promise<{ valid: boolean; user?: any }> {
  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { valid: false }
  params.delete('hash')

  const pairs: string[] = []
  for (const [key, value] of params.entries()) pairs.push(`${key}=${value}`)
  pairs.sort()
  const dataCheckString = pairs.join('\n')

  // secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN) — так требует Telegram
  const secretKey = await hmacSha256('WebAppData', BOT_TOKEN)
  const computedHash = toHex(await hmacSha256(secretKey, dataCheckString))

  if (computedHash !== hash) return { valid: false }

  const authDate = Number(params.get('auth_date') || 0)
  const ageSeconds = Date.now() / 1000 - authDate
  if (ageSeconds > 86400) return { valid: false } // initData старше суток — просим переоткрыть

  let user
  try {
    user = JSON.parse(params.get('user') || 'null')
  } catch {
    user = null
  }

  return { valid: true, user }
}

async function upsertParticipant(telegramId: string, user: any): Promise<string> {
  const headers = {
    apikey: SERVICE_ROLE_KEY,
    Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
    'Content-Type': 'application/json',
  }

  const existing = await fetch(
    `${SUPABASE_URL}/rest/v1/participants?telegram_id=eq.${telegramId}&select=id`,
    { headers }
  ).then((r) => r.json())

  if (existing?.length) return existing[0].id

  const inserted = await fetch(`${SUPABASE_URL}/rest/v1/participants`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify({
      telegram_id: Number(telegramId),
      name: user?.first_name || 'Клиент',
      is_active: true,
    }),
  }).then((r) => r.json())

  return inserted[0].id
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const { initData } = await req.json()
    if (!initData) return json({ error: 'initData required' }, 400)

    const { valid, user } = await verifyInitData(initData)
    if (!valid || !user?.id) return json({ error: 'invalid initData' }, 401)

    const telegramId = String(user.id)
    const clientId = await upsertParticipant(telegramId, user)

    const key = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(JWT_SECRET),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )

    const token = await create(
      { alg: 'HS256', typ: 'JWT' },
      {
        sub: clientId,
        role: 'authenticated',
        aud: 'authenticated',
        telegram_id: telegramId,
        exp: getNumericDate(60 * 60 * 24), // токен живёт 24 часа
      },
      key
    )

    return json({ token, client_id: clientId })
  } catch (err) {
    console.error('[telegram-auth]', err)
    return json({ error: 'internal error' }, 500)
  }
})
