import React, { useState } from 'react'

const initialWeeks = [
  {
    number: 1,
    title: 'Заметить себя',
    description: 'Разбираемся, что происходит сейчас',
    status: 'completed',
  },
  {
    number: 2,
    title: 'Услышать себя',
    description: 'Исследуем чувства, потребности и желания',
    status: 'current',
  },
  {
    number: 3,
    title: 'Изменить привычное',
    description: 'Пробуем новые способы взаимодействия',
    status: 'future',
  },
  {
    number: 4,
    title: 'Закрепить изменения',
    description: 'Сохраняем то, что получилось',
    status: 'future',
  },
]

const initialTasks = [
  {
    id: 1,
    title: 'Что происходит в наших отношениях сейчас?',
    description:
      'Опиши несколько ситуаций, в которых особенно сильно чувствуешь дистанцию с партнёром.',
    completed: false,
    allowText: true,
    allowPhotos: true,
  },
  {
    id: 2,
    title: 'Замечаем свои потребности',
    description:
      'Напиши, чего тебе сейчас больше всего хочется получать от отношений.',
    completed: false,
    allowText: true,
    allowPhotos: false,
  },
]

const initialMaterials = [
  {
    id: 1,
    session: 'Сессия 1',
    date: '3 сентября',
    title: 'Материал после первой сессии',
    type: 'PDF',
  },
  {
    id: 2,
    session: 'Сессия 2',
    date: '10 сентября',
    title: 'Рекомендации после сессии',
    type: 'Документ',
  },
]

function RoutePage({
  mood,
  setMood,
  resource,
  setResource,
  tasks,
  setTasks,
  reflectionSaved,
  setReflectionSaved,
}) {
  const [factor, setFactor] = useState('')
  const [comment, setComment] = useState('')

  const completedTasks = tasks.filter((task) => task.completed).length
  const [taskAnswers, setTaskAnswers] = useState({})
const [submittedTasks, setSubmittedTasks] = useState({})

const updateTaskAnswer = (taskId, value) => {
  setTaskAnswers((current) => ({
    ...current,
    [taskId]: value,
  }))
}

const submitTask = (taskId) => {
  const answer = taskAnswers[taskId]?.trim()

  if (!answer) {
    alert('Сначала напиши ответ на задание.')
    return
  }

  setSubmittedTasks((current) => ({
    ...current,
    [taskId]: true,
  }))

  setTasks(
    tasks.map((task) =>
      task.id === taskId
        ? { ...task, completed: true }
        : task
    )
  )
}

  const toggleTask = (id) => {
    setTasks(
      tasks.map((task) =>
        task.id === id
          ? { ...task, completed: !task.completed }
          : task
      )
    )
  }

  const saveReflection = () => {
    if (mood === null || resource === null) return
    setReflectionSaved(true)
  }

  return (
    <>
      <h1 className="page-title">Твой маршрут</h1>

      <p className="page-subtitle">
        4 недели к более близким и осознанным отношениям
      </p>

      <section className="route-card">
        <div className="route">

          <div className="route-line"></div>

          <div
            className="route-line-progress"
            style={{ height: '25%' }}
          ></div>

          {initialWeeks.map((week) => (
            <div
              className={`week ${week.status}`}
              key={week.number}
            >
              <div className="week-content">
                <div className="week-title">
                  Неделя {week.number}
                </div>

                <div className="week-description">
                  {week.title}
                  <br />
                  {week.description}
                </div>
              </div>

              <div className="week-point">
                {week.status === 'completed'
                  ? '✓'
                  : week.number}
              </div>
            </div>
          ))}

        </div>
      </section>

      <section className="current-week-card">
        <div className="current-week-label">
          Текущая неделя
        </div>

        <h2>Неделя 2 — Услышать себя</h2>

        <p>
          Исследуем чувства, потребности и желания,
          которые влияют на отношения.
        </p>
      </section>

      <section className="tasks-card">
        <div className="section-heading">
          <div>
            <h2>Задания недели</h2>
            <p>
              Выполнено {completedTasks} из {tasks.length}
            </p>
          </div>
        </div>

        <div className="tasks-list">
          {tasks.map((task) => (
            <div className="task-card" key={task.id}>

              <button
                className={`task-check ${
                  task.completed ? 'checked' : ''
                }`}
                onClick={() => toggleTask(task.id)}
              >
                {task.completed ? '✓' : ''}
              </button>

              <div className="task-body">
                <div className="task-title">
                  {task.title}
                </div>

                <div className="task-description">
                  {task.description}
                </div>

                {task.allowText && (
                  <textarea
                    className="task-textarea"
                    placeholder="Напиши свой ответ..."
                  />
                )}

                {task.allowPhotos && (
                  <button
                    className="upload-button"
                    onClick={() =>
                      alert(
                        'Здесь появится загрузка 1–3 фотографий'
                      )
                    }
                  >
                    📷 Добавить фото
                  </button>
                )}

                {task.completed && (
                  <div className="task-status">
                    ✓ Задание отмечено выполненным
                  </div>
                )}
              </div>

            </div>
          ))}
        </div>
      </section>

      <section className="session-card">
        <div className="session-label">
          Следующая сессия
        </div>

        <div className="session-date">
          10 сентября в 19:00
        </div>

        <div className="session-type">
          Онлайн • Zoom
        </div>

        <button
          className="session-button"
          onClick={() =>
            alert('Здесь будет ссылка на Zoom')
          }
        >
          Подключиться
        </button>
      </section>

      <section className="reflection-card">
        <h2 className="reflection-title">
          Ежедневная рефлексия
        </h2>

        <div className="reflection-question">
          Как ты себя чувствуешь сегодня?
        </div>

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
                style={
                  mood === index + 1
                    ? {
                        boxShadow:
                          '0 0 0 2px #55745c',
                      }
                    : {}
                }
              >
                {emoji}
              </div>

              <div className="mood-label">
                {label}
              </div>
            </button>
          ))}
        </div>

        <div className="reflection-question resource-question">
          Сколько у тебя сегодня ресурса?
        </div>

        <div className="resource-list">
          {[
            ['🪫', 'Почти нет'],
            ['🔋', 'Мало'],
            ['🔋🔋', 'Средне'],
            ['🔋🔋🔋', 'Много'],
            ['🔋🔋🔋🔋', 'Очень много'],
          ].map(([icon, label], index) => (
            <button
              className={`resource-item ${
                resource === index ? 'selected' : ''
              }`}
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

        <div className="reflection-question">
          Что сегодня больше всего повлияло
          на твоё состояние?
        </div>

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
              className={`factor ${
                factor === label ? 'selected' : ''
              }`}
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

        <button
          className="reflection-save"
          onClick={saveReflection}
          disabled={mood === null || resource === null}
        >
          Сохранить рефлексию
        </button>

        {reflectionSaved && (
          <div className="reflection-saved">
            ✓ Рефлексия сохранена
          </div>
        )}
      </section>
    </>
  )
}

function MaterialsPage() {
  return (
    <>
      <h1 className="page-title">Материалы</h1>

      <p className="page-subtitle">
        Всё, что психолог подготовил после сессий
      </p>

      <div className="materials-list">

        {initialMaterials.map((material) => (
          <div
            className="material-card"
            key={material.id}
          >
            <div className="material-icon">
              📄
            </div>

            <div className="material-content">

              <div className="material-session">
                {material.session} · {material.date}
              </div>

              <div className="material-title">
                {material.title}
              </div>

              <div className="material-type">
                {material.type}
              </div>

            </div>

            <div className="material-arrow">
              ›
            </div>
          </div>
        ))}

      </div>

      <div className="materials-note">
        Материалы могут быть разными: текст,
        схема, PDF, изображение, видео или другой
        файл. Они появляются здесь после сессии.
      </div>
    </>
  )
}

function ProfilePage({ tasks }) {
  const completedTasks = tasks.filter(
    (task) => task.completed
  ).length

  return (
    <>
      <h1 className="page-title">Профиль</h1>

      <p className="page-subtitle">
        Твоё личное пространство в практикуме
      </p>

      <section className="profile-card">
        <div className="profile-avatar">
          А
        </div>

        <div>
          <div className="profile-name">
            Анна
          </div>

          <div className="profile-age">
            32 года
          </div>
        </div>
      </section>

      <section className="profile-info-card">

        <div className="profile-row">
          <div className="profile-label">
            Твоя цель
          </div>

          <div className="profile-value">
            Стать ближе к партнёру
          </div>
        </div>

        <div className="profile-divider"></div>

        <div className="profile-row">
          <div className="profile-label">
            Профессиональный запрос
          </div>

          <div className="profile-value">
            Будет определён вместе с психологом
          </div>
        </div>

      </section>

      <section className="progress-card">

        <div className="progress-header">
          <span>Прогресс практикума</span>

          <strong>
            1 из 4 недель
          </strong>
        </div>

        <div className="progress-bar">
          <div className="progress-fill"></div>
        </div>

        <div className="progress-text">
          Ты уже начала свой путь. Продолжай.
        </div>

      </section>

      <section className="completed-card">

        <div className="completed-header">
          <h2>Выполненные задания</h2>

          <span>
            {completedTasks}
          </span>
        </div>

        {tasks
          .filter((task) => task.completed)
          .map((task) => (
            <div
              className="completed-task"
              key={task.id}
            >
              <div className="completed-check">
                ✓
              </div>

              <div>
                <div className="completed-task-title">
                  {task.title}
                </div>

                <div className="completed-task-info">
                  Ответ сохранён
                </div>
              </div>
            </div>
          ))}

        {completedTasks === 0 && (
          <div className="empty-state">
            Здесь появятся выполненные задания.
          </div>
        )}

      </section>
    </>
  )
}

function App() {
  const [activeNav, setActiveNav] = useState('route')

  const [mood, setMood] = useState(null)
  const [resource, setResource] = useState(null)

  const [tasks, setTasks] = useState(initialTasks)

  const [reflectionSaved, setReflectionSaved] =
    useState(false)

  const renderPage = () => {
    if (activeNav === 'materials') {
      return <MaterialsPage />
    }

    if (activeNav === 'profile') {
      return <ProfilePage tasks={tasks} />
    }

    return (
      <RoutePage
        mood={mood}
        setMood={setMood}
        resource={resource}
        setResource={setResource}
        tasks={tasks}
        setTasks={setTasks}
        reflectionSaved={reflectionSaved}
        setReflectionSaved={setReflectionSaved}
      />
    )
  }

  return (
    <div className="app">

      <header className="app-header">

        <div className="logo">

          <div className="logo-symbol">
            ☯
          </div>

          <div className="logo-title">
            ИНЬ ЯН
          </div>

        </div>

        <div className="notification">
          ♧
        </div>

      </header>

      <main>
        {renderPage()}
      </main>

      <nav className="bottom-nav">

        <button
          className={`nav-item ${
            activeNav === 'route'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveNav('route')
          }
        >
          <span className="nav-icon">
            🗺
          </span>
          Маршрут
        </button>

        <button
          className={`nav-item ${
            activeNav === 'materials'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveNav('materials')
          }
        >
          <span className="nav-icon">
            📚
          </span>
          Материалы
        </button>

        <button
          className={`nav-item ${
            activeNav === 'profile'
              ? 'active'
              : ''
          }`}
          onClick={() =>
            setActiveNav('profile')
          }
        >
          <span className="nav-icon">
            👤
          </span>
          Профиль
        </button>

      </nav>

    </div>
  )
}

export default App
