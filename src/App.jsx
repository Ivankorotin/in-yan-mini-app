import React, { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import { getTelegramId, initTelegramApp } from './lib/telegram'
import {
  loadClientData,
  setTaskCompleted,
  saveTaskAnswer as apiSaveTaskAnswer,
  uploadTaskPhoto,
  saveReflection as apiSaveReflection,
} from './lib/api'

const initialWeeks = [
  { number: 1, title: 'Заметить себя', description: 'Разбираемся, что происходит сейчас', status: 'completed' },
  { number: 2, title: 'Услышать себя', description: 'Исследуем чувства, потребности и желания', status: 'current' },
  { number: 3, title: 'Изменить привычное', description: 'Пробуем новые способы взаимодействия', status: 'future' },
  { number: 4, title: 'Закрепить изменения', description: 'Сохраняем то, что получилось', status: 'future' },
]

const initialTasks = [
  {
    id: 1,
    title: 'Что происходит в наших отношениях сейчас?',
    description: 'Опиши несколько ситуаций, в которых особенно сильно чувствуешь дистанцию с партнёром.',
    completed: false,
    answer: '',
    allowText: true,
    allowPhotos: true,
  },
  {
    id: 2,
    title: 'Замечаем свои потребности',
    description: 'Напиши, чего тебе сейчас больше всего хочется получать от отношений.',
    completed: false,
    answer: '',
    allowText: true,
    allowPhotos: false,
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
  professionalRequest: 'Будет определён вместе с психологом',
  currentWeek: 1,
}

const initialSession = {
  display: '10 сентября в 19:00',
  format: 'Онлайн • Zoom',
  link: null,
}

function formatSessionDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  const datePart = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' }).format(d)
  const timePart = new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(d)
  return `${datePart} в ${timePart}`
}

function RoutePage({
  weeks,
  tasks,
  setTasks,
  clientId,
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
  const [photoCounts, setPhotoCounts] = useState({})
  const pendingPhotoTaskId = useRef(null)
  const fileInputRef = useRef(null)

  const completedTasks = tasks.filter((task) => task.completed).length
  const currentWeek = weeks.find((w) => w.status === 'current') || weeks[0]

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
    await apiSaveTaskAnswer(taskId, answer)
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

    setPhotoCounts((current) => ({ ...current, [taskId]: (current[taskId] || 0) + files.length }))

    for (const file of files) {
      await uploadTaskPhoto(taskId, file)
    }
    event.target.value = '' // сброс, чтобы можно было выбрать те же файлы повторно
  }

  const saveReflection = async () => {
    if (mood === null || resource === null) return
    setReflectionSaved(true)
    if (clientId) {
      await apiSaveReflection(clientId, { mood, resource, factor, comment })
    }
  }

  return (
    <>
      <h1 className="page-title">Твой маршрут</h1>
      <p className="page-subtitle">4 недели к более близким и осознанным отношениям</p>

      <section className="route-card">
        <div className="route">
          <div className="route-line"></div>
          <div
            className="route-line-progress"
            style={{
              height:
                weeks.length > 1
                  ? `${(weeks.findIndex((w) => w.number === (currentWeek?.number ?? 1)) / (weeks.length - 1)) * 100}%`
                  : '0%',
            }}
          ></div>

          {weeks.map((week) => (
            <div className={`week ${week.status} ${week.number % 2 === 1 ? 'week-left' : 'week-right'}`} key={week.number}>
              <div className="week-content">
                <div className="week-title">Неделя {week.number}</div>
                <div className="week-description">
                  {week.title}
                  <br />
                  {week.description}
                </div>
              </div>
              <div className="week-point">{week.status === 'completed' ? '✓' : week.number}</div>
            </div>
          ))}
        </div>
      </section>

      {currentWeek && (
        <section className="current-week-card">
          <div className="current-week-label">Текущая неделя</div>
          <h2>Неделя {currentWeek.number} — {currentWeek.title}</h2>
          <p>{currentWeek.description}</p>
        </section>
      )}

      <section className="tasks-card">
        <div className="section-heading">
          <div>
            <h2>Задания недели</h2>
            <p>Выполнено {completedTasks} из {tasks.length}</p>
          </div>
        </div>

        <div className="tasks-list">
          {tasks.map((task) => (
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
                  <button className="upload-button" onClick={() => openPhotoPicker(task.id)}>
                    📷 Добавить фото{photoCounts[task.id] ? ` (${photoCounts[task.id]})` : ''}
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
        <h2 className="reflection-title">Ежедневная рефлексия</h2>
        <div className="reflection-question">Как ты себя чувствуешь сегодня?</div>

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

        <div className="reflection-question resource-question">Сколько у тебя сегодня ресурса?</div>
        <div className="resource-list">
          {[
            ['🪫', 'Почти нет'],
            ['🔋', 'Мало'],
            ['🔋🔋', 'Средне'],
            ['🔋🔋🔋', 'Много'],
            ['🔋🔋🔋🔋', 'Очень много'],
          ].map(([icon, label], index) => (
            <button
              className={`resource-item ${resource === index ? 'selected' : ''}`}
              key={label}
              onClick={() => {
                setResource(index)
                setReflectionSaved(false)
              }}
            >
              <span>{icon}</span>
              <small>{label}</small>
            </button>
          ))}
        </div>

        <div className="reflection-question">Что сегодня больше всего повлияло на твоё состояние?</div>
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
              <div className="material-session">{material.session} · {material.date}</div>
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

function ProfilePage({ tasks, profile }) {
  const completedTasks = tasks.filter((task) => task.completed).length

  return (
    <>
      <h1 className="page-title">Профиль</h1>
      <p className="page-subtitle">Твоё личное пространство в практикуме</p>

      <section className="profile-card">
        <div className="profile-avatar">{profile.name?.[0] || '?'}</div>
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
          <strong>{profile.currentWeek} из 4 недель</strong>
        </div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${(profile.currentWeek / 4) * 100}%` }}></div>
        </div>
        <div className="progress-text">Ты уже начала свой путь. Продолжай.</div>
      </section>

      <section className="completed-card">
        <div className="completed-header">
          <h2>Выполненные задания</h2>
          <span>{completedTasks}</span>
        </div>

        {tasks
          .filter((task) => task.completed)
          .map((task) => (
            <div className="completed-task" key={task.id}>
              <div className="completed-check">✓</div>
              <div>
                <div className="completed-task-title">{task.title}</div>
                <div className="completed-task-info">Ответ сохранён</div>
              </div>
            </div>
          ))}

        {completedTasks === 0 && <div className="empty-state">Здесь появятся выполненные задания.</div>}
      </section>
    </>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState('route')
  const [loading, setLoading] = useState(true)

  const [clientId, setClientId] = useState(null)
  const [profile, setProfile] = useState(initialProfile)
  const [weeks, setWeeks] = useState(initialWeeks)
  const [tasks, setTasks] = useState(initialTasks)
  const [materials, setMaterials] = useState(initialMaterials)
  const [session, setSession] = useState(initialSession)

  const [mood, setMood] = useState(null)
  const [resource, setResource] = useState(null)
  const [reflectionSaved, setReflectionSaved] = useState(false)

  useEffect(() => {
    initTelegramApp()

    async function boot() {
      const telegramId = getTelegramId()
      const data = await loadClientData(telegramId)

      if (data) {
        const { client, weeks: dbWeeks, materials: dbMaterials, reflection } = data

        setClientId(client.id)
        setProfile({
          name: client.name,
          age: client.age,
          goal: client.goal || 'Будет определена вместе с психологом',
          professionalRequest: client.professional_request,
          currentWeek: client.current_week,
        })

        if (dbWeeks.length) {
          setWeeks(dbWeeks.map((w) => ({
            number: w.number,
            title: w.title,
            description: w.description,
            status: w.status,
          })))

          const current = dbWeeks.find((w) => w.status === 'current') || dbWeeks[0]
          setTasks(
            (current.tasks || []).map((t) => ({
              id: t.id,
              title: t.title,
              description: t.description,
              completed: t.completed,
              answer: t.answer || '',
              allowText: t.allow_text,
              allowPhotos: t.allow_photos,
            }))
          )
        }

        if (dbMaterials.length) {
          setMaterials(
            dbMaterials.map((m) => ({
              id: m.id,
              session: m.session_label,
              date: m.session_date,
              title: m.title,
              type: m.type,
            }))
          )
        }

        setSession({
          display: formatSessionDate(client.next_session_at) || initialSession.display,
          format: client.next_session_format || initialSession.format,
          link: client.next_session_link,
        })

        if (reflection) {
          setMood(reflection.mood)
          setResource(reflection.resource)
          setReflectionSaved(true)
        }
      }
      // Если data === null (Supabase не настроен или клиент ещё не заведён),
      // просто остаёмся на моковых данных, объявленных выше.

      setLoading(false)
    }

    boot()
  }, [])

  const renderPage = () => {
    if (activeNav === 'materials') return <MaterialsPage materials={materials} />
    if (activeNav === 'profile') return <ProfilePage tasks={tasks} profile={profile} />

    return (
      <RoutePage
        weeks={weeks}
        tasks={tasks}
        setTasks={setTasks}
        clientId={clientId}
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

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo">
          <div className="logo-symbol">☯</div>
          <div className="logo-title">ИНЬ ЯН</div>
        </div>
        <div className="notification">♧</div>
      </header>

      {!supabase && (
        <div className="dev-banner">
          Supabase не настроен — работаем на демо-данных, ничего не сохраняется. См. .env.example.
        </div>
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
