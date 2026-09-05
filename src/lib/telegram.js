// Достаём telegram_id текущего пользователя из Telegram WebApp SDK.
// Вне Telegram (например, при локальной разработке в браузере)
// используем демо-id, чтобы можно было тестировать интерфейс.
export function getTelegramId() {
  const tg = window.Telegram?.WebApp
  const user = tg?.initDataUnsafe?.user
  if (user?.id) return String(user.id)
  return 'demo-user'
}

// Фото профиля из Telegram (если пользователь его открыл боту).
// Поле photo_url не проверяется криптографически, поэтому используем
// его только для отображения аватарки, а не как источник истины.
export function getTelegramPhotoUrl() {
  const tg = window.Telegram?.WebApp
  return tg?.initDataUnsafe?.user?.photo_url || null
}

export function initTelegramApp() {
  const tg = window.Telegram?.WebApp
  if (tg) {
    tg.ready()
    tg.expand()
  }
}

// ВАЖНО про безопасность (см. README): initDataUnsafe можно подделать
// в браузере, это нормально для MVP, но перед боевым запуском стоит
// проверять initData на сервере (Supabase Edge Function) так же,
// как мы обсуждали для варианта с отдельным Express-бэкендом.
