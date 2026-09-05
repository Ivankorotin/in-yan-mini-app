import { supabase } from './supabaseClient'

// Загружает клиента и весь его маршрут (недели → задания, материалы,
// сегодняшнюю рефлексию) одним заходом. Возвращает null, если
// Supabase не настроен или клиент ещё не заведён в базе.
export async function loadClientData(telegramId) {
  if (!supabase) return null

  const { data: client, error: clientError } = await supabase
    .from('clients')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (clientError) {
    console.error('[in-yan] Ошибка загрузки клиента:', clientError)
    return null
  }
  if (!client) return null

  const { data: weeks } = await supabase
    .from('weeks')
    .select('*, tasks(*)')
    .eq('client_id', client.id)
    .order('number')

  const { data: materials } = await supabase
    .from('materials')
    .select('*')
    .eq('client_id', client.id)
    .order('sort_order')

  const today = new Date().toISOString().slice(0, 10)
  const { data: reflection } = await supabase
    .from('reflections')
    .select('*')
    .eq('client_id', client.id)
    .eq('entry_date', today)
    .maybeSingle()

  return { client, weeks: weeks || [], materials: materials || [], reflection: reflection || null }
}

export async function setTaskCompleted(taskId, completed) {
  if (!supabase) return
  const { error } = await supabase.from('tasks').update({ completed }).eq('id', taskId)
  if (error) console.error('[in-yan] Не удалось сохранить статус задания:', error)
}

export async function saveTaskAnswer(taskId, answer) {
  if (!supabase) return
  const { error } = await supabase
    .from('tasks')
    .update({ answer, completed: true })
    .eq('id', taskId)
  if (error) console.error('[in-yan] Не удалось сохранить ответ на задание:', error)
}

export async function uploadTaskPhoto(taskId, file) {
  if (!supabase) return null
  const path = `${taskId}/${Date.now()}-${file.name}`
  const { error: uploadError } = await supabase.storage.from('task-photos').upload(path, file)
  if (uploadError) {
    console.error('[in-yan] Не удалось загрузить фото:', uploadError)
    return null
  }
  const { error: insertError } = await supabase
    .from('task_photos')
    .insert({ task_id: taskId, storage_path: path })
  if (insertError) console.error('[in-yan] Не удалось сохранить запись о фото:', insertError)
  return path
}

export async function saveReflection(clientId, { mood, resource, factor, comment }) {
  if (!supabase) return
  const today = new Date().toISOString().slice(0, 10)
  const { error } = await supabase
    .from('reflections')
    .upsert(
      { client_id: clientId, entry_date: today, mood, resource, factor, comment },
      { onConflict: 'client_id,entry_date' }
    )
  if (error) console.error('[in-yan] Не удалось сохранить рефлексию:', error)
}
