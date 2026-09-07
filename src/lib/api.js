import { getActiveClient } from './supabaseClient'

// ============================================================
// Работа с реальной схемой Supabase:
// participants → route_steps, sessions, tasks (→ task_submissions
// → task_photos), materials (→ sessions), reflections.
// ============================================================

export async function loadParticipantData(telegramId) {
  const client = getActiveClient()
  if (!client) return null

  const { data: participant, error: participantError } = await client
    .from('participants')
    .select('*')
    .eq('telegram_id', telegramId)
    .maybeSingle()

  if (participantError) {
    console.error('[in-yan] Ошибка загрузки участника:', participantError)
    return null
  }
  if (!participant) return null

  const { data: routeSteps } = await client
    .from('route_steps')
    .select('*')
    .eq('participant_id', participant.id)
    .order('step_number')

  const { data: tasks } = await client
    .from('tasks')
    .select('*, task_submissions(*, task_photos(*))')
    .eq('participant_id', participant.id)

  const { data: sessions } = await client
    .from('sessions')
    .select('*')
    .eq('participant_id', participant.id)
    .order('session_number')

  const { data: materials } = await client
    .from('materials')
    .select('*, sessions(session_number, session_date)')
    .eq('participant_id', participant.id)
    .order('created_at')

  const today = new Date().toISOString().slice(0, 10)
  const { data: reflection } = await client
    .from('reflections')
    .select('*')
    .eq('participant_id', participant.id)
    .eq('reflection_date', today)
    .maybeSingle()

  return {
    participant,
    routeSteps: routeSteps || [],
    tasks: tasks || [],
    sessions: sessions || [],
    materials: materials || [],
    reflection: reflection || null,
  }
}

export async function setTaskCompleted(taskId, completed) {
  const client = getActiveClient()
  if (!client) return
  const { error } = await client.from('tasks').update({ completed }).eq('id', taskId)
  if (error) console.error('[in-yan] Не удалось сохранить статус задания:', error)
}

// В этой схеме ответ хранится отдельно от задания (task_submissions),
// поэтому вместо upsert по неизвестному ограничению делаем это вручную:
// ищем существующую отправку по task_id и обновляем её, либо создаём новую.
async function getOrCreateSubmission(client, taskId, participantId) {
  const { data: existing } = await client
    .from('task_submissions')
    .select('*')
    .eq('task_id', taskId)
    .maybeSingle()

  if (existing) return existing

  const { data: created, error } = await client
    .from('task_submissions')
    .insert({ task_id: taskId, participant_id: participantId })
    .select()
    .single()

  if (error) {
    console.error('[in-yan] Не удалось создать отправку задания:', error)
    return null
  }
  return created
}

export async function saveTaskAnswer(taskId, participantId, answer) {
  const client = getActiveClient()
  if (!client) return

  const submission = await getOrCreateSubmission(client, taskId, participantId)
  if (!submission) return

  const { error: submissionError } = await client
    .from('task_submissions')
    .update({ text_answer: answer, submitted_at: new Date().toISOString() })
    .eq('id', submission.id)

  if (submissionError) {
    console.error('[in-yan] Не удалось сохранить ответ на задание:', submissionError)
    return
  }

  const { error: taskError } = await client.from('tasks').update({ completed: true }).eq('id', taskId)
  if (taskError) console.error('[in-yan] Не удалось отметить задание выполненным:', taskError)
}

export async function uploadTaskPhoto(taskId, participantId, file) {
  const client = getActiveClient()
  if (!client) return null

  const submission = await getOrCreateSubmission(client, taskId, participantId)
  if (!submission) return null

  const { count } = await client
    .from('task_photos')
    .select('id', { count: 'exact', head: true })
    .eq('submission_id', submission.id)

  const photoNumber = (count || 0) + 1
  const path = `${taskId}/${Date.now()}-${file.name}`

  const { error: uploadError } = await client.storage.from('task-photos').upload(path, file)
  if (uploadError) {
    console.error('[in-yan] Не удалось загрузить фото:', uploadError)
    return null
  }

  const { error: insertError } = await client
    .from('task_photos')
    .insert({ submission_id: submission.id, storage_path: path, photo_number: photoNumber })
  if (insertError) console.error('[in-yan] Не удалось сохранить запись о фото:', insertError)

  return path
}

export async function saveReflection(participantId, { wellbeing, resource_level, state_factor, additional_comment }) {
  const client = getActiveClient()
  if (!client) return

  const today = new Date().toISOString().slice(0, 10)
  const { data: existing } = await client
    .from('reflections')
    .select('id')
    .eq('participant_id', participantId)
    .eq('reflection_date', today)
    .maybeSingle()

  const payload = { wellbeing, resource_level, state_factor, additional_comment }

  const { error } = existing
    ? await client.from('reflections').update(payload).eq('id', existing.id)
    : await client.from('reflections').insert({ ...payload, participant_id: participantId, reflection_date: today })

  if (error) console.error('[in-yan] Не удалось сохранить рефлексию:', error)
}
