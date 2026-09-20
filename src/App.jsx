import React, { useEffect, useRef, useState } from 'react'
import { getTelegramId, getTelegramPhotoUrl, initTelegramApp } from './lib/telegram'
import { authenticateWithTelegram } from './lib/telegramAuth'
import {
  loadParticipantData,
  setTaskCompleted,
  saveTaskAnswer as apiSaveTaskAnswer,
  uploadTaskPhoto as apiUploadTaskPhoto,
  saveReflection as apiSaveReflection,
  acceptRules as apiAcceptRules,
} from './lib/api'

const initialSteps = [
  { number: 1, title: 'Заметить себя', status: 'completed' },
  { number: 2, title: 'Услышать себя', status: 'current' },
  { number: 3, title: 'Изменить привычное', status: 'future' },
  { number: 4, title: 'Закрепить изменения', status: 'future' },
]

const initialTasks = [
  {
    id: 1,
    routeStepNumber: 2,
    title: 'Что происходит в наших отношениях сейчас?',
    description: 'Опиши несколько ситуаций, в которых особенно сильно чувствуешь дистанцию с партнёром.',
    completed: false,
    answer: '',
    allowText: true,
    allowPhotos: true,
    photoLimit: 3,
    photoCount: 0,
  },
  {
    id: 2,
    routeStepNumber: 2,
    title: 'Замечаем свои потребности',
    description: 'Напиши, чего тебе сейчас больше всего хочется получать от отношений.',
    completed: false,
    answer: '',
    allowText: true,
    allowPhotos: false,
    photoLimit: 0,
    photoCount: 0,
  },
]

const initialMaterials = [
  { id: 1, session: 'Сессия 1', date: '3 сентября', title: 'Материал после первой сессии', type: 'PDF' },
  { id: 2, session: 'Сессия 2', date: '10 сентября', title: 'Рекомендации после сессии', type: 'Документ' },
]

const initialProfile = {
  name: 'Анна',
  age: 32,
  goal: 'Стать ближе к партнёру',
  initialSituation: '',
  professionalRequest: 'Будет определён вместе с психологом',
  currentStep: 1,
}

const initialSession = {
  display: '10 сентября в 19:00',
  format: 'Онлайн • Zoom',
  link: null,
}

// Простые схематичные чёрно-белые иконки для правил участия —
// каждая раскрывает суть своего пункта, без внешних иконок-наборов.
const RuleIcons = {
  shield: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M12 3l7 3v5c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3z" strokeLinejoin="round" />
      <path d="M9 12l2 2 4-4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  target: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8" />
      <circle cx="12" cy="12" r="4.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" />
    </svg>
  ),
  calendar: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="3.5" y="5" width="17" height="15" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" strokeLinecap="round" />
    </svg>
  ),
  people: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="9" cy="9" r="3" />
      <circle cx="16" cy="10.5" r="2.3" />
      <path d="M4 20c0-3 2.5-5 5-5s5 2 5 5" strokeLinecap="round" />
      <path d="M14.5 15.3c2 .2 3.5 1.9 3.5 4.2" strokeLinecap="round" />
    </svg>
  ),
  clock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  lock: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <rect x="5" y="10.5" width="14" height="9.5" rx="2" />
      <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" strokeLinecap="round" />
      <circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  ),
  chat: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M4 5.5h16v10H9l-4 3.5v-3.5H4z" strokeLinejoin="round" />
    </svg>
  ),
  flag: (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
      <path d="M6 3.5v17" strokeLinecap="round" />
      <path d="M6 4l6 2-6 2M12 6l6 2-6 2" strokeLinejoin="round" />
    </svg>
  ),
}

const RULES_SECTIONS = [
  {
    icon: 'shield',
    title: '1. Ответственность за результат',
    body: [
      'Практикум не предполагает гарантированного результата в отношениях. Изменения зависят не только от работы на сессиях, но и от решений и действий самого клиента.',
      'Клиент самостоятельно несёт ответственность за свои решения, действия и изменения в своей жизни.',
    ],
  },
  {
    icon: 'target',
    title: '2. Желаемый результат практикума',
    body: [
      'В начале работы мы совместно формулируем желаемый результат практикума.',
      'При этом цель (точку В) определяет сам клиент — именно он решает, к каким изменениям хочет прийти в своих отношениях.',
      'Задачи семейного психолога как сопровождающего:',
    ],
    list: [
      'помогать исследовать ситуацию',
      'способствовать устранению внутренних барьеров и ограничений',
      'способствовать разрешению внутриличностного конфликта (при его наличии)',
      'замечать важное, находя новые возможности и способы действий, которые могут приблизить клиента к выбранному им результату',
    ],
  },
  {
    icon: 'calendar',
    title: '3. Как проходит практикум',
    body: [
      'Практикум состоит из 5 индивидуальных онлайн-сессий, заданий между встречами и самостоятельной работы клиента.',
      'Содержание заданий и направление работы определяются с учётом индивидуальной ситуации и запроса клиента.',
      'Для получения результата важно не только присутствовать на сессиях, но и уделять внимание заданиям и своим наблюдениям между встречами.',
    ],
  },
  {
    icon: 'people',
    title: '4. Личное участие клиента',
    body: [
      'Практикум — это совместная работа. Психолог со своей стороны предоставляет профессиональное психологическое сопровождение, помогает анализировать ситуацию и искать новые возможности.',
      'При этом клиент остаётся активным участником процесса: самостоятельно принимает решения, выбирает, что применять в своей жизни, и определяет темп собственных изменений.',
    ],
  },
  {
    icon: 'clock',
    title: '5. Перенос онлайн-сессии',
    body: [
      'Перенос сессии возможен, если клиент предупреждает об этом не позднее чем за 2 дня до назначенного времени. В этом случае мы согласовываем новое время встречи.',
      'Если отмена или перенос происходят менее чем за 2 дня до сессии, возможность повторного проведения этой сессии не предоставляется.',
      'В случае непредвиденных обстоятельств или форс-мажора возможность переноса рассматривается индивидуально.',
    ],
  },
  {
    icon: 'lock',
    title: '6. Конфиденциальность',
    body: [
      'Всё, чем клиент делится в рамках индивидуального сопровождения, рассматривается как конфиденциальная информация и не передаётся третьим лицам без согласия клиента, за исключением случаев, предусмотренных законодательством.',
    ],
  },
  {
    icon: 'chat',
    title: '7. Обратная связь и взаимодействие между сессиями',
    body: [
      'Вопросы, связанные с выполнением заданий и материалами практикума, можно обсуждать на сессии.',
      'При этом личное сопровождение не предполагает постоянной доступности психолога в мессенджерах. Вся работа с запросом происходит в рамках запланированных сессий и заданий.',
    ],
  },
  {
    icon: 'flag',
    title: '8. Завершение практикума',
    body: [
      'Практикум завершается после прохождения запланированных сессий и выполнения индивидуального маршрута.',
      'На завершающей сессии мы резюмируем выполненную работу, отмечаем произошедшие изменения и определяем дальнейшие возможности личностного роста.',
      'После завершения практикума клиенту предлагается заполнить форму обратной связи из 8 вопросов.',
    ],
  },
]

function RulesModal({ onAccept }) {
  return (
    <div className="rules-overlay">
      <div className="rules-modal">
        <div className="rules-modal-header">
          <h2>Правила участия в практикуме</h2>
          <p>с личным сопровождением</p>
        </div>

        <div className="rules-modal-body">
          {RULES_SECTIONS.map((section) => (
            <div className="rules-section" key={section.title}>
              <div className="rules-section-icon">{RuleIcons[section.icon]}</div>
              <div className="rules-section-content">
                <h3>{section.title}</h3>
                {section.body.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
                {section.list && (
                  <ul>
                    {section.list.map((li, i) => (
                      <li key={i}>{li}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="rules-modal-footer">
          <button className="rules-question-btn" onClick={() => window.open('https://t.me/ivankorotin', '_blank')}>
            Есть вопрос
          </button>
          <button className="rules-accept-btn" onClick={onAccept}>
            Принимаю
          </button>
        </div>
      </div>
    </div>
  )
}

function formatSessionDateTime(dateStr, timeStr) {
  if (!dateStr) return null
  const d = new Date(timeStr ? `${dateStr}T${timeStr}` : dateStr)
  const datePart = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d)
  if (!timeStr) return datePart
  const timePart = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d)
  return `${datePart} в ${timePart}`
}

// ============================================================
// Карта маршрута: изогнутая линия с точками-шагами и финишем.
// Каждая точка — короткая формулировка шага (step.title),
// последняя точка совмещена с финишем практикума.
// ============================================================
function wrapLabel(text, maxCharsPerLine) {
  const words = (text || '').split(' ')
  const lines = []
  let line = ''
  words.forEach((word) => {
    if ((line + ' ' + word).trim().length > maxCharsPerLine && line) {
      lines.push(line.trim())
      line = word
    } else {
      line = (line + ' ' + word).trim()
    }
  })
  if (line) lines.push(line)
  return lines.slice(0, 2)
}

function buildRoutePoints(count, { startX = 34, endX = 286, baseY = 74, amplitude = 15 } = {}) {
  const step = count > 1 ? (endX - startX) / (count - 1) : 0
  return Array.from({ length: count }, (_, i) => ({
    x: startX + step * i,
    y: baseY + (i % 2 === 0 ? amplitude : -amplitude),
  }))
}

function buildRouteCurve(points, controlOffset = 16) {
  if (points.length < 2) return ''
  let d = `M ${points[0].x} ${points[0].y}`
  for (let i = 1; i < points.length; i++) {
    const p0 = points[i - 1]
    const p1 = points[i]
    const mx = (p0.x + p1.x) / 2
    d += ` Q ${mx} ${p0.y + (i % 2 === 0 ? controlOffset : -controlOffset)} ${p1.x} ${p1.y}`
  }
  return d
}

function RoutePage({
  steps,
  tasks,
  setTasks,
  participantId,
  mood,
  setMood,
  resource,
  setResource,
  reflectionSaved,
  setReflectionSaved,
  session,
}) {
  const [factor, setFactor] = useState('')
  const [comment, setComment] = useState('')
  const [taskAnswers, setTaskAnswers] = useState(() =>
    Object.fromEntries(tasks.map((t) => [t.id, t.answer || '']))
  )
  const pendingPhotoTaskId = useRef(null)
  const fileInputRef = useRef(null)

  const currentStep = steps.find((s) => s.status === 'current') || steps[0]
  const currentTasks = tasks.filter((t) => t.routeStepNumber === currentStep?.number)
  const completedTasks = currentTasks.filter((task) => task.completed).length

  const updateTaskAnswer = (taskId, value) => {
    setTaskAnswers((current) => ({ ...current, [taskId]: value }))
  }

  const submitTask = async (taskId) => {
    const answer = taskAnswers[taskId]?.trim()
    if (!answer) {
      alert('Сначала напиши ответ на задание.')
      return
    }
    setTasks(tasks.map((task) => (task.id === taskId ? { ...task, completed: true, answer } : task)))
    await apiSaveTaskAnswer(taskId, participantId, answer)
  }

  // Чекбокс работает только для заданий без текстового ответа —
  // для остальных статус "выполнено" ставится через "Сохранить ответ",
  // чтобы нельзя было отметить задание, не ответив на него.
  const toggleTask = async (task) => {
    if (task.allowText) return
    const next = !task.completed
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, completed: next } : t)))
    await setTaskCompleted(task.id, next)
  }

  const openPhotoPicker = (taskId) => {
    pendingPhotoTaskId.current = taskId
    fileInputRef.current?.click()
  }

  const handlePhotoChange = async (event) => {
    const taskId = pendingPhotoTaskId.current
    const files = Array.from(event.target.files || [])
    if (!taskId || files.length === 0) return

    setTasks(tasks.map((t) => (t.id === taskId ? { ...t, photoCount: (t.photoCount || 0) + files.length } : t)))

    for (const file of files) {
      await apiUploadTaskPhoto(taskId, participantId, file)
    }
    event.target.value = '' // сброс, чтобы можно было выбрать те же файлы повторно
  }

  const saveReflection = async () => {
    if (mood === null || resource === null) return
    setReflectionSaved(true)
    if (participantId) {
      await apiSaveReflection(participantId, {
        wellbeing: mood,
        resource_level: resource,
        state_factor: factor,
        additional_comment: comment,
      })
    }
  }

  // 4 недели + отдельная точка-финиш = 5 точек на карте.
  const routePoints = buildRoutePoints(steps.length + 1, { baseY: 68, amplitude: 16 })
  const finishPoint = routePoints[routePoints.length - 1]
  const pathAll = buildRouteCurve(routePoints)
  const currentIdx = steps.findIndex((s) => s.status === 'current')
  const solidCount = currentIdx === -1 ? steps.length : currentIdx + 1
  const pathSolid = solidCount > 1 ? buildRouteCurve(routePoints.slice(0, solidCount)) : null

  return (
    <>
      <h1 className="page-title">Твой маршрут</h1>

      <section className="route-card">
        <svg className="route-svg" viewBox="0 0 320 140">
          <path d={pathAll} className="route-path-base" />
          {pathSolid && <path d={pathSolid} className="route-path-progress" />}

          {steps.map((step, i) => {
            const p = routePoints[i]
            const lines = wrapLabel(step.title, 13)
            const labelY = -22
            const r = step.status === 'current' ? 10 : 8

            return (
              <g key={step.number} className="route-node">
                {step.status === 'current' && <circle cx={p.x} cy={p.y} r={r + 6} className="route-node-glow" />}
                <circle cx={p.x} cy={p.y} r={r} className={`route-node-dot ${step.status}`} />
                {step.status === 'completed' ? (
                  <path d={`M ${p.x - 3.5} ${p.y} l 2.5 2.5 l 5 -5`} className="route-node-check" />
                ) : (
                  <text x={p.x} y={p.y + 3.5} textAnchor="middle" className="route-node-number">{step.number}</text>
                )}
                {lines.map((ln, li) => (
                  <text key={li} x={p.x} y={p.y + labelY + li * 10} textAnchor="middle" className="route-node-label">{ln}</text>
                ))}
                <text x={p.x} y={p.y + r + 16} textAnchor="middle" className="route-node-sub">
                  неделя {step.number}
                </text>
              </g>
            )
          })}

          <g className="route-node">
            <circle cx={finishPoint.x} cy={finishPoint.y} r={10} className="route-node-dot finish" />
            <text x={finishPoint.x} y={finishPoint.y + 3.5} textAnchor="middle" fontSize="10">🏁</text>
            <text x={finishPoint.x} y={finishPoint.y - 22} textAnchor="middle" className="route-node-label">Финиш</text>
            <text x={finishPoint.x} y={finishPoint.y + 26} textAnchor="middle" className="route-node-sub">финиш</text>
          </g>
        </svg>
      </section>

      {currentStep && (
        <section className="current-week-card">
          <div className="current-week-label">Текущая неделя</div>
          <h2>Неделя {currentStep.number} — {currentStep.title}</h2>
        </section>
      )}

      <section className="tasks-card">
        <div className="section-heading">
          <div>
            <h2>Задания недели</h2>
            <p>Выполнено {completedTasks} из {currentTasks.length}</p>
          </div>
        </div>

        <div className="tasks-list">
          {currentTasks.map((task) => (
            <div className="task-card" key={task.id}>
              <button
                className={`task-check ${task.completed ? 'checked' : ''}`}
                onClick={() => toggleTask(task)}
                aria-label="Отметить выполненным"
              >
                {task.completed ? '✓' : ''}
              </button>

              <div className="task-body">
                <div className="task-title">{task.title}</div>
                <div className="task-description">{task.description}</div>

                {task.allowText && (
                  <>
                    <textarea
                      className="task-textarea"
                      placeholder="Напиши свой ответ..."
                      value={taskAnswers[task.id] || ''}
                      onChange={(e) => updateTaskAnswer(task.id, e.target.value)}
                    />
                    <button
                      className="task-save"
                      onClick={() => submitTask(task.id)}
                      disabled={task.completed && taskAnswers[task.id] === task.answer}
                    >
                      {task.completed ? 'Обновить ответ' : 'Сохранить ответ'}
                    </button>
                  </>
                )}

                {task.allowPhotos && (
                  <button
                    className="upload-button"
                    onClick={() => openPhotoPicker(task.id)}
                    disabled={task.photoLimit > 0 && task.photoCount >= task.photoLimit}
                  >
                    📷 Добавить фото
                    {task.photoLimit > 0 ? ` (${task.photoCount || 0}/${task.photoLimit})` : task.photoCount ? ` (${task.photoCount})` : ''}
                  </button>
                )}

                {task.completed && <div className="task-status">✓ Задание отмечено выполненным</div>}
              </div>
            </div>
          ))}
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          ref={fileInputRef}
          style={{ display: 'none' }}
          onChange={handlePhotoChange}
        />
      </section>

      <section className="session-card">
        <div className="session-label">Следующая сессия</div>
        <div className="session-date">{session.display}</div>
        <div className="session-type">{session.format}</div>
        <button
          className="session-button"
          onClick={() => {
            if (session.link) window.open(session.link, '_blank')
            else alert('Здесь будет ссылка на Zoom')
          }}
        >
          Подключиться
        </button>
      </section>

      <section className="reflection-card">
        <h2 className="reflection-title">Еженедельная рефлексия</h2>
        <div className="reflection-question">Как ты себя чувствуешь на этой неделе?</div>

        <div className="mood-list">
          {[
            ['😣', 'Очень тяжело'],
            ['😕', 'Скорее тяжело'],
            ['😐', 'Нормально'],
            ['🙂', 'Скорее хорошо'],
            ['😊', 'Хорошо'],
          ].map(([emoji, label], index) => (
            <button
              className="mood"
              key={label}
              onClick={() => {
                setMood(index + 1)
                setReflectionSaved(false)
              }}
            >
              <div
                className="mood-face"
                style={mood === index + 1 ? { boxShadow: '0 0 0 2px #55745c' } : {}}
              >
                {emoji}
              </div>
              <div className="mood-label">{label}</div>
            </button>
          ))}
        </div>

        <div className="reflection-question resource-question">Сколько у тебя ресурса на этой неделе?</div>
        <div className="resource-scale">
          <input
            type="range"
            min="1"
            max="5"
            step="1"
            value={resource ?? 3}
            className="resource-slider"
            onChange={(e) => {
              setResource(Number(e.target.value))
              setReflectionSaved(false)
            }}
          />
          <div className="resource-scale-value">
            {resource || 3} — {['', 'ресурса нет', 'мало', 'средне', 'много ресурса', 'полон сил'][resource || 3]}
          </div>
          <div className="resource-scale-ends">
            <span>1 · ресурса нет</span>
            <span>5 · полон сил</span>
          </div>
        </div>

        <div className="reflection-question">Что на этой неделе больше всего повлияло на твоё состояние?</div>
        <div className="factor-list">
          {[
            ['❤️', 'Отношения'],
            ['💼', 'Работа'],
            ['👨‍👩‍👧', 'Семья'],
            ['📚', 'Учёба'],
            ['😴', 'Сон / усталость'],
            ['😊', 'Что-то хорошее'],
          ].map(([icon, label]) => (
            <button
              className={`factor ${factor === label ? 'selected' : ''}`}
              key={label}
              onClick={() => {
                setFactor(label)
                setReflectionSaved(false)
              }}
            >
              {icon} {label}
            </button>
          ))}
        </div>

        <textarea
          className="reflection-textarea"
          placeholder="Можно добавить что-то ещё..."
          value={comment}
          onChange={(event) => {
            setComment(event.target.value)
            setReflectionSaved(false)
          }}
        />

        <button className="reflection-save" onClick={saveReflection} disabled={mood === null || resource === null}>
          Сохранить рефлексию
        </button>

        {reflectionSaved && <div className="reflection-saved">✓ Рефлексия сохранена</div>}
      </section>
    </>
  )
}

function MaterialsPage({ materials }) {
  return (
    <>
      <h1 className="page-title">Материалы</h1>
      <p className="page-subtitle">Всё, что психолог подготовил после сессий</p>

      <div className="materials-list">
        {materials.map((material) => (
          <div className="material-card" key={material.id}>
            <div className="material-icon">📄</div>
            <div className="material-content">
              <div className="material-session">{material.session}{material.date ? ` · ${material.date}` : ''}</div>
              <div className="material-title">{material.title}</div>
              <div className="material-type">{material.type}</div>
            </div>
            <div className="material-arrow">›</div>
          </div>
        ))}
      </div>

      <div className="materials-note">
        Материалы могут быть разными: текст, схема, PDF, изображение, видео или другой файл. Они появляются здесь после сессии.
      </div>
    </>
  )
}

function ProfilePage({ tasks, profile, photoUrl }) {
  const completedTasks = tasks.filter((task) => task.completed)

  return (
    <>
      <h1 className="page-title">Профиль</h1>
      <p className="page-subtitle">Твоё личное пространство в практикуме</p>

      <section className="profile-card">
        {photoUrl ? (
          <img src={photoUrl} alt={profile.name} className="profile-avatar profile-avatar-photo" />
        ) : (
          <div className="profile-avatar">{profile.name?.[0] || '?'}</div>
        )}
        <div>
          <div className="profile-name">{profile.name}</div>
          {profile.age && <div className="profile-age">{profile.age} года</div>}
        </div>
      </section>

      <section className="profile-info-card">
        <div className="profile-row">
          <div className="profile-label">Твоя цель</div>
          <div className="profile-value">{profile.goal}</div>
        </div>
        <div className="profile-divider"></div>
        <div className="profile-row">
          <div className="profile-label">Профессиональный запрос</div>
          <div className="profile-value">{profile.professionalRequest}</div>
        </div>
      </section>

      <section className="progress-card">
        <div className="progress-header">
          <span>Прогресс практикума</span>
          <strong>{profile.currentStep} из 4 недель</strong>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(profile.currentStep / 4) * 100}%` }}></div>
        </div>
        <div className="progress-text">Ты уже начала свой путь. Продолжай.</div>
      </section>

      <section className="completed-card">
        <div className="completed-header">
          <h2>Выполненные задания</h2>
          <span>{completedTasks.length}</span>
        </div>

        {completedTasks.map((task) => (
          <div className="completed-task" key={task.id}>
            <div className="completed-check">✓</div>
            <div>
              <div className="completed-task-title">{task.title}</div>
              <div className="completed-task-info">Ответ сохранён</div>
            </div>
          </div>
        ))}

        {completedTasks.length === 0 && <div className="empty-state">Здесь появятся выполненные задания.</div>}
      </section>
    </>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState('route')
  const [loading, setLoading] = useState(true)

  const [participantId, setParticipantId] = useState(null)
  const [profile, setProfile] = useState(initialProfile)
  const [photoUrl, setPhotoUrl] = useState(null)
  const [steps, setSteps] = useState(initialSteps)
  const [tasks, setTasks] = useState(initialTasks)
  const [materials, setMaterials] = useState(initialMaterials)
  const [session, setSession] = useState(initialSession)

  const [mood, setMood] = useState(null)
  const [resource, setResource] = useState(null)
  const [reflectionSaved, setReflectionSaved] = useState(false)
  const [debugNote, setDebugNote] = useState(null)
  const [showRules, setShowRules] = useState(false)

  useEffect(() => {
    initTelegramApp()
    setPhotoUrl(getTelegramPhotoUrl())

    async function boot() {
      const telegramId = getTelegramId()
      const auth = await authenticateWithTelegram() // проверяет initData на сервере до похода в базу

      const notes = {
        'no-supabase': 'Supabase не настроен (нет VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY) — работаем на демо-данных.',
        'no-init-data': 'Похоже, приложение открыто не через кнопку меню бота — Telegram не передал данные для проверки.',
        'function-error': `Проверка Telegram не прошла: ${auth.message || 'см. логи функции telegram-auth в Supabase'}.`,
      }
      if (auth.reason !== 'ok') setDebugNote(notes[auth.reason])

      const data = await loadParticipantData(telegramId)

      if (!data && auth.reason === 'ok') {
        setDebugNote('Проверка Telegram прошла, но участник ещё не найден в базе — заведите маршрут через supabase/add_test_participant.sql.')
      }

      if (data) {
        setDebugNote(null)
        const { participant, routeSteps, tasks: dbTasks, sessions, materials: dbMaterials, reflection } = data

        setParticipantId(participant.id)
        setShowRules(!participant.rules_accepted_at)
        setProfile({
          name: participant.name,
          age: participant.age,
          goal: participant.goal || 'Будет определена вместе с психологом',
          initialSituation: participant.initial_situation || '',
          professionalRequest: participant.professional_request || 'Будет определён вместе с психологом',
          currentStep: participant.current_step || 1,
        })

        if (routeSteps.length) {
          setSteps(routeSteps.map((s) => ({
            number: s.step_number,
            title: s.title,
            // В базе шаг называется "upcoming", в интерфейсе — "future"
            status: s.status === 'upcoming' ? 'future' : s.status,
          })))
        }

        if (dbTasks.length) {
          setTasks(
            dbTasks.map((t) => {
              const submission = t.task_submissions?.[0]
              return {
                id: t.id,
                routeStepNumber: routeSteps.find((s) => s.id === t.route_step_id)?.step_number,
                title: t.title,
                description: t.description,
                completed: t.completed,
                answer: submission?.text_answer || '',
                allowText: t.allow_text,
                allowPhotos: t.allow_photos,
                photoLimit: t.photo_limit || 0,
                photoCount: submission?.task_photos?.length || 0,
              }
            })
          )
        }

        if (dbMaterials.length) {
          setMaterials(
            dbMaterials.map((m) => ({
              id: m.id,
              session: m.sessions ? `Сессия ${m.sessions.session_number}` : 'Общие материалы',
              date: m.sessions?.session_date
                ? new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(new Date(m.sessions.session_date))
                : null,
              title: m.title,
              type: m.file_type || 'Документ',
            }))
          )
        }

        // Сессия, соответствующая текущему шагу маршрута (нумерация шагов
        // и сессий совпадает 1:1 — раз в неделю созвон на каждом шаге).
        const upcomingSession =
          sessions.find((s) => s.session_number === participant.current_step) ||
          sessions.find((s) => new Date(s.session_date) >= new Date()) ||
          sessions[sessions.length - 1]

        if (upcomingSession) {
          setSession({
            display: formatSessionDateTime(upcomingSession.session_date, upcomingSession.session_time) || initialSession.display,
            format: 'Онлайн • Zoom',
            link: upcomingSession.zoom_url,
          })
        }

        if (reflection) {
          setMood(reflection.wellbeing)
          setResource(reflection.resource_level)
          setReflectionSaved(true)
        }
      }
      // Если data === null (Supabase не настроен, проверка Telegram не
      // прошла, или участник ещё не заведён), остаёмся на моковых данных.

      setLoading(false)
    }

    boot()
  }, [])

  const renderPage = () => {
    if (activeNav === 'materials') return <MaterialsPage materials={materials} />
    if (activeNav === 'profile') return <ProfilePage tasks={tasks} profile={profile} photoUrl={photoUrl} />

    return (
      <RoutePage
        steps={steps}
        tasks={tasks}
        setTasks={setTasks}
        participantId={participantId}
        mood={mood}
        setMood={setMood}
        resource={resource}
        setResource={setResource}
        reflectionSaved={reflectionSaved}
        setReflectionSaved={setReflectionSaved}
        session={session}
      />
    )
  }

  const handleAcceptRules = async () => {
    setShowRules(false)
    if (participantId) await apiAcceptRules(participantId)
  }

  return (
    <div className="app">
      {showRules && <RulesModal onAccept={handleAcceptRules} />}

      <header className="app-header">
        <div className="logo">
          <img src="/logo.png" alt="Инь Янь" className="logo-mark" />
          <div className="logo-text">
            <div className="logo-title">Инь Янь</div>
            <div className="logo-tagline">практикум по отношениям с личным сопровождением</div>
          </div>
        </div>
      </header>

      {debugNote && !loading && (
        <div className="dev-banner">{debugNote}</div>
      )}

      <main>{loading ? <p className="page-subtitle">Загрузка…</p> : renderPage()}</main>

      <nav className="bottom-nav">
        <button className={`nav-item ${activeNav === 'route' ? 'active' : ''}`} onClick={() => setActiveNav('route')}>
          <span className="nav-icon">🗺</span>
          Маршрут
        </button>
        <button className={`nav-item ${activeNav === 'materials' ? 'active' : ''}`} onClick={() => setActiveNav('materials')}>
          <span className="nav-icon">📚</span>
          Материалы
        </button>
        <button className={`nav-item ${activeNav === 'profile' ? 'active' : ''}`} onClick={() => setActiveNav('profile')}>
          <span className="nav-icon">👤</span>
          Профиль
        </button>
      </nav>
    </div>
  )
}

export default App
