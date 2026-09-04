import React, { useState } from 'react'

const weeks = [
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

function App() {
  const [activeNav, setActiveNav] = useState('route')
  const [mood, setMood] = useState(null)

  return (
    <div className="app">

      <header className="app-header">
        <div className="logo">
          <div className="logo-symbol">☯</div>
          <div className="logo-title">ИНЬ ЯН</div>
        </div>

        <div className="notification">♧</div>
      </header>

      <main>
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

            {weeks.map((week) => (
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

          <button className="session-button">
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
              ['😣', 'Очень плохо'],
              ['😕', 'Плохо'],
              ['😐', 'Нейтрально'],
              ['🙂', 'Хорошо'],
              ['😊', 'Отлично'],
            ].map(([emoji, label], index) => (
              <button
                className="mood"
                key={label}
                onClick={() => setMood(index)}
              >
                <div
                  className="mood-face"
                  style={
                    mood === index
                      ? { boxShadow: '0 0 0 2px #55745c' }
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
        </section>
      </main>

      <nav className="bottom-nav">

        <button
          className={`nav-item ${
            activeNav === 'route' ? 'active' : ''
          }`}
          onClick={() => setActiveNav('route')}
        >
          <span className="nav-icon">🗺</span>
          Маршрут
        </button>

        <button
          className={`nav-item ${
            activeNav === 'materials' ? 'active' : ''
          }`}
          onClick={() => setActiveNav('materials')}
        >
          <span className="nav-icon">📚</span>
          Материалы
        </button>

        <button
          className={`nav-item ${
            activeNav === 'profile' ? 'active' : ''
          }`}
          onClick={() => setActiveNav('profile')}
        >
          <span className="nav-icon">👤</span>
          Профиль
        </button>

      </nav>

    </div>
  )
}

export default App
