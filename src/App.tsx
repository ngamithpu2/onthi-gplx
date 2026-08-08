import { useEffect, useRef, useState } from 'react'
import questionsJson from './data/questions.json'
import {
  buildExam,
  buildTodayQueue,
  calculateExamDuration,
  DEFAULT_EXAM_PROFILE,
  getReadiness,
  recordAnswer,
  selectModeQuestions,
} from './learning'
import { INITIAL_STATE, loadLocalState, saveLocalState } from './storage'
import {
  getAuthState,
  loadAdminSummary,
  loadExamProfile,
  loadRemoteProgress,
  signIn,
  signOut,
  supabase,
  syncAttempts,
  syncProgress,
  type AuthState,
} from './supabase'
import type {
  AttemptAnswer,
  ExamProfile,
  LocalState,
  MockAttempt,
  Question,
  QuestionProgress,
  StudyMode,
} from './types'

const questions = questionsJson as Question[]
const LETTERS = ['A', 'B', 'C', 'D']

type View = 'home' | 'study' | 'exam' | 'admin'

function mergeProgress(
  local: Record<number, QuestionProgress>,
  remote: Record<number, QuestionProgress>,
) {
  const result = { ...local }
  for (const [id, item] of Object.entries(remote)) {
    const localItem = result[Number(id)]
    const localTime = localItem?.lastSeen ? new Date(localItem.lastSeen).getTime() : 0
    const remoteTime = item.lastSeen ? new Date(item.lastSeen).getTime() : 0
    if (!localItem || remoteTime > localTime) result[Number(id)] = item
  }
  return result
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Chưa hoạt động'
  return new Intl.DateTimeFormat('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value))
}

import { PORTAL_MODULES, type PortalModule } from './config/modules'

function Header({
  view,
  auth,
  currentModule,
  onSelectModule,
  onNavigate,
  onOpenAuth,
  onSignOut,
}: {
  view: View
  auth: AuthState
  currentModule: PortalModule
  onSelectModule: (mod: PortalModule) => void
  onNavigate: (view: View) => void
  onOpenAuth: () => void
  onSignOut: () => void
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="brand" onClick={() => onNavigate('home')} aria-label="Về trang tổng quan K602">
          <span className="brand-mark">K602</span>
          <div>
            <strong>K602 Portal</strong>
            <small>Nền tảng Tri thức & Tiện ích</small>
          </div>
        </button>

        <div className="category-dropdown-container" ref={menuRef}>
          <button
            className="category-selector-btn"
            onClick={() => setDropdownOpen(!dropdownOpen)}
            aria-expanded={dropdownOpen}
          >
            <span className="cat-badge">{currentModule.badge}</span>
            <span className="cat-name">{currentModule.shortTitle}</span>
            <span className="cat-arrow">▾</span>
          </button>

          {dropdownOpen && (
            <div className="category-dropdown-menu">
              <div className="dropdown-title">Danh mục Chuyên mục Portal</div>
              {PORTAL_MODULES.map((mod) => (
                <button
                  key={mod.id}
                  className={`dropdown-item ${mod.id === currentModule.id ? 'active' : ''}`}
                  onClick={() => {
                    onSelectModule(mod)
                    setDropdownOpen(false)
                  }}
                >
                  <div className="dropdown-item-main">
                    <strong>{mod.title}</strong>
                    <small>{mod.description}</small>
                  </div>
                  <span className={`status-pill ${mod.active ? 'active' : 'coming'}`}>
                    {mod.badge}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Điều hướng chính">
        <button className={view === 'home' ? 'active' : ''} onClick={() => onNavigate('home')}>
          Tổng quan
        </button>
        {auth.role === 'admin' && (
          <button className={view === 'admin' ? 'active' : ''} onClick={() => onNavigate('admin')}>
            Quản trị
          </button>
        )}
      </nav>
      <div className="account-area">
        {auth.user ? (
          <button className="account-button" onClick={onSignOut} title="Nhấn để đăng xuất">
            <span className="account-avatar">{(auth.displayName || auth.user.email || 'HV').slice(0, 2).toUpperCase()}</span>
            <span>{auth.displayName || auth.user.email}</span>
          </button>
        ) : (
          <button className="device-mode-badge" onClick={onOpenAuth} title="Nhấn để xem thông tin tài khoản">
            <span>Lưu trên thiết bị</span>
          </button>
        )}
      </div>
    </header>
  )
}

function MobileBottomNav({
  view,
  role,
  onNavigate,
  onOpenExam,
  onOpenAuth,
}: {
  view: View
  role: string
  onNavigate: (view: View) => void
  onOpenExam: () => void
  onOpenAuth: () => void
}) {
  return (
    <nav className="mobile-bottom-nav" aria-label="Điều hướng di động">
      <button
        className={`nav-item ${view === 'home' ? 'active' : ''}`}
        onClick={() => onNavigate('home')}
      >
        <span>Trang chủ</span>
      </button>
      <button
        className={`nav-item ${view === 'exam' ? 'active' : ''}`}
        onClick={onOpenExam}
      >
        <span>Thi thử</span>
      </button>
      {role === 'admin' ? (
        <button
          className={`nav-item ${view === 'admin' ? 'active' : ''}`}
          onClick={() => onNavigate('admin')}
        >
          <span>Quản trị</span>
        </button>
      ) : (
        <button
          className="nav-item"
          onClick={onOpenAuth}
        >
          <span>Tài khoản</span>
        </button>
      )}
    </nav>
  )
}

function ProgressRing({ score }: { score: number }) {
  return (
    <div className="progress-ring" style={{ '--score': `${score * 3.6}deg` } as React.CSSProperties}>
      <div>
        <strong>{score}%</strong>
        <span>Sẵn sàng</span>
      </div>
    </div>
  )
}

function Home({
  state,
  currentModule,
  onSelectModule,
  examPanelRef,
  onStart,
  onStartChapter,
  onStartExam,
}: {
  state: LocalState
  currentModule: PortalModule
  onSelectModule: (mod: PortalModule) => void
  examPanelRef: React.RefObject<HTMLDivElement | null>
  onStart: (mode: Exclude<StudyMode, 'exam'>) => void
  onStartChapter: (chapter: string) => void
  onStartExam: (questionCount: number, durationMinutes: number) => void
}) {
  const readiness = getReadiness(questions, state.progress)
  const dueCount = questions.filter((question) => {
    const due = state.progress[question.id]?.nextDue
    return due && new Date(due).getTime() <= Date.now()
  }).length
  const weakCount = questions.filter((question) => {
    const item = state.progress[question.id]
    return item?.seen && (item.mastery < 3 || item.lastResult === 'wrong')
  }).length
  const chapters = [...new Set(questions.map((question) => question.chapter))]

  const [selectedCount, setSelectedCount] = useState(30)
  const [customInput, setCustomInput] = useState('')

  const presets = [15, 20, 25, 30, 50, 150]
  const currentCount = customInput ? Math.min(150, Math.max(5, Number(customInput) || 30)) : selectedCount
  const estimatedDuration = calculateExamDuration(currentCount)

  const handlePresetSelect = (count: number) => {
    setSelectedCount(count)
    setCustomInput('')
  }

  const handleCustomInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, '')
    setCustomInput(val)
  }

  return (
    <main className="page-shell">
      {/* BAR CHỌN NHANH CÁC CHUYÊN MỤC PORTAL K602 */}
      <div className="category-tabs-bar" aria-label="Chuyên mục Portal">
        {PORTAL_MODULES.map((mod) => (
          <button
            key={mod.id}
            className={`category-tab-chip ${mod.id === currentModule.id ? 'active' : ''}`}
            onClick={() => onSelectModule(mod)}
          >
            <span>{mod.shortTitle}</span>
            <small>{mod.badge}</small>
          </button>
        ))}
      </div>

      <section className="hero-grid">
        <div className="hero-card">
          <div>
            <div className="eyebrow">Hệ thống học tập</div>
            <h1>Học lý thuyết lái xe A1 khoa học</h1>
            <p>Ứng dụng phương pháp ghi nhớ ngắt quãng giúp tối ưu thời gian ôn tập và đạt hiệu quả cao.</p>
          </div>
          <div className="hero-meta">
            <div className="hero-meta-chip"><span>Câu đến hạn ôn</span><b>{dueCount} câu</b></div>
            <div className="hero-meta-chip"><span>Câu cần củng cố</span><b>{weakCount} câu</b></div>
            <div className="hero-meta-chip"><span>Câu trọng yếu đã vững</span><b>{readiness.criticalMastered}/{readiness.criticalTotal} câu</b></div>
          </div>
        </div>

        <div className="readiness-card">
          <ProgressRing score={readiness.score} />
          <div className="readiness-details">
            <h3>Độ sẵn sàng</h3>
            <p>Đánh giá tổng thể mức độ hoàn thành toàn bộ chương trình</p>
          </div>
        </div>
      </section>

      <div>
        <h2 className="section-title">Chế độ luyện tập</h2>
        <section className="quick-grid" aria-label="Các chế độ luyện tập">
          <button className="quick-card" onClick={() => onStart('all')}>
            <div>
              <strong>Học toàn bộ 150 câu</strong>
              <small>Ôn tập lần lượt toàn bộ bộ đề</small>
            </div>
            <span className="arrow-text">Vào học</span>
          </button>
          <button className="quick-card" onClick={() => onStart('weak')}>
            <div>
              <strong>Câu hay làm sai</strong>
              <small>{weakCount} câu cần rèn luyện thêm</small>
            </div>
            <span className="arrow-text">Vào học</span>
          </button>
          <button className="quick-card" onClick={() => onStart('critical')}>
            <div>
              <strong>Câu trọng yếu (Điểm liệt)</strong>
              <small>{readiness.criticalMastered}/6 câu đã vững kiến thức</small>
            </div>
            <span className="arrow-text">Vào học</span>
          </button>
        </section>
      </div>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Sáu nhóm kiến thức</h2>
            </div>
            <span>{readiness.seen}/150 câu</span>
          </div>
          <div className="chapter-list">
            {chapters.map((chapter) => {
              const chapterQuestions = questions.filter((question) => question.chapter === chapter)
              const mastered = chapterQuestions.filter(
                (question) => (state.progress[question.id]?.mastery ?? 0) >= 3,
              ).length
              const percent = Math.round((mastered / chapterQuestions.length) * 100)
              return (
                <button
                  type="button"
                  className="chapter-row"
                  key={chapter}
                  onClick={() => onStartChapter(chapter)}
                  aria-label={`Luyện nhóm ${chapter}, ${mastered} trên ${chapterQuestions.length} câu đã vững`}
                >
                  <div className="chapter-row-header">
                    <strong>{chapter}</strong>
                    <span className="chapter-percent">{percent}%</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${percent}%` }} />
                  </div>
                  <div>
                    <span>{mastered}/{chapterQuestions.length} câu đã vững</span>
                  </div>
                </button>
              )
            })}
          </div>
        </article>

        <aside className="panel exam-panel" ref={examPanelRef}>
          <div className="exam-panel-header">
            <span className="eyebrow">Mô phỏng kỳ thi</span>
            <h2>Thi thử tùy chỉnh</h2>
            <p>Chọn số lượng câu hỏi phù hợp với thời gian học tập của bạn.</p>
          </div>

          <div className="exam-config-box">
            <div className="exam-config-title">
              <span>Số câu hỏi bài thi</span>
              <small style={{ color: 'var(--text-muted)', textTransform: 'none' }}>Tối đa 150 câu</small>
            </div>
            <div className="exam-presets-grid">
              {presets.map((count) => (
                <button
                  key={count}
                  type="button"
                  className={`preset-chip ${!customInput && selectedCount === count ? 'active' : ''}`}
                  onClick={() => handlePresetSelect(count)}
                >
                  {count === 150 ? 'Tất cả (150)' : `${count} câu`}
                </button>
              ))}
            </div>
            <div className="custom-count-input">
              <label htmlFor="custom-questions-count">Nhập số câu khác:</label>
              <input
                id="custom-questions-count"
                type="text"
                maxLength={3}
                placeholder="5 - 150"
                value={customInput}
                onChange={handleCustomInputChange}
              />
            </div>
          </div>

          <div className="exam-summary-strip">
            <div className="exam-summary-item">
              <span>Thời gian</span>
              <strong>{estimatedDuration} phút</strong>
            </div>
            <div className="exam-summary-item">
              <span>Lượt đã thi</span>
              <strong>{state.attempts.length} lượt</strong>
            </div>
          </div>

          <button
            className="primary-exam-button"
            onClick={() => onStartExam(currentCount, estimatedDuration)}
          >
            Bắt đầu thi thử ({currentCount} câu)
          </button>
        </aside>
      </section>
    </main>
  )
}

function QuestionCard({
  question,
  position,
  total,
  selected,
  answered,
  unsure,
  examMode,
  onSelect,
  onToggleUnsure,
  onNext,
}: {
  question: Question
  position: number
  total: number
  selected: number | null
  answered: boolean
  unsure: boolean
  examMode: boolean
  onSelect: (index: number) => void
  onToggleUnsure: () => void
  onNext: () => void
}) {
  return (
    <article className="question-card">
      <div className="question-topline">
        <span className="question-index-badge">Câu {position} / {total} (Mã #{question.id})</span>
        <div className="question-badges">
          {question.critical && <b className="critical-badge">Câu trọng yếu</b>}
          <span className="chapter-badge">{question.chapter}</span>
        </div>
      </div>
      <div className="question-progress">
        <i style={{ width: `${(position / total) * 100}%` }} />
      </div>

      <h1>{question.question}</h1>

      {question.image && (
        <figure className="question-image">
          <img src={question.image} alt={`Hình minh họa câu ${question.id}`} />
        </figure>
      )}

      <div className="option-list">
        {question.options.map((option, index) => {
          let stateClass = selected === index ? 'selected' : ''
          if (answered && index === question.answer) stateClass = 'correct'
          if (answered && selected === index && index !== question.answer) stateClass = 'wrong'

          return (
            <button
              className={`option-button ${stateClass}`}
              onClick={() => onSelect(index)}
              disabled={answered}
              key={option}
            >
              <span className="option-letter">{LETTERS[index]}</span>
              <strong>{option}</strong>
            </button>
          )
        })}
      </div>

      {!examMode && !answered && (
        <button className={`unsure-button ${unsure ? 'active' : ''}`} onClick={onToggleUnsure}>
          {unsure ? 'Đã đánh dấu chưa chắc' : 'Chưa chắc chắn'}
        </button>
      )}

      {answered && !examMode && (
        <div className={`feedback-box ${selected === question.answer ? 'success' : 'error'}`}>
          <bold>{selected === question.answer ? 'Chính xác' : 'Chưa chính xác'}</bold>
          <p style={{ marginTop: '4px' }}><strong>Đáp án đúng:</strong> {question.options[question.answer]}</p>
        </div>
      )}

      <div className="sticky-bottom-actions">
        <button className="primary-button" disabled={selected === null} onClick={onNext}>
          {examMode ? 'Lưu & Tiếp tục' : answered ? 'Câu tiếp theo' : 'Kiểm tra đáp án'}
        </button>
      </div>
    </article>
  )
}

function Study({
  queue,
  title,
  setState,
  onExit,
}: {
  queue: Question[]
  title: string
  setState: React.Dispatch<React.SetStateAction<LocalState>>
  onExit: () => void
}) {
  const [items, setItems] = useState(queue)
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answered, setAnswered] = useState(false)
  const [unsure, setUnsure] = useState(false)
  const startedAt = useRef(Date.now())
  const question = items[index]

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ('1234'.includes(event.key) && !answered) {
        const option = Number(event.key) - 1
        if (question && option < question.options.length) setSelected(option)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answered, question])

  if (!question) {
    return (
      <main className="center-page">
        <div className="completion-card">
          <h1>Hoàn thành phiên học</h1>
          <p style={{ margin: '12px 0 24px', color: 'var(--text-muted)' }}>Bạn đã hoàn thành toàn bộ câu hỏi trong phiên này.</p>
          <button className="primary-button" onClick={onExit}>Về trang tổng quan</button>
        </div>
      </main>
    )
  }

  const handleNext = () => {
    if (selected === null) return
    if (!answered) {
      const correct = selected === question.answer
      const responseMs = Date.now() - startedAt.current
      setState((current) => ({
        ...current,
        progress: {
          ...current.progress,
          [question.id]: recordAnswer(
            current.progress[question.id],
            question,
            correct,
            unsure,
            responseMs,
          ),
        },
        lastUpdatedAt: new Date().toISOString(),
      }))
      if (!correct && !items.slice(index + 1).some((item) => item.id === question.id)) {
        setItems((current) => {
          const updated = [...current]
          updated.splice(Math.min(index + 6, updated.length), 0, question)
          return updated
        })
      }
      setAnswered(true)
      return
    }
    setIndex((value) => value + 1)
    setSelected(null)
    setAnswered(false)
    setUnsure(false)
    startedAt.current = Date.now()
  }

  return (
    <main className="study-shell">
      <div className="study-header">
        <button className="back-button" onClick={onExit}>Thoát</button>
        <div className="study-session-meta">
          <strong>{title}</strong>
          <span>{items.length - index - 1} câu còn lại</span>
        </div>
      </div>
      <QuestionCard
        question={question}
        position={index + 1}
        total={items.length}
        selected={selected}
        answered={answered}
        unsure={unsure}
        examMode={false}
        onSelect={setSelected}
        onToggleUnsure={() => setUnsure((value) => !value)}
        onNext={handleNext}
      />
    </main>
  )
}

function Exam({
  profile,
  setState,
  onExit,
}: {
  state: LocalState
  profile: ExamProfile
  setState: React.Dispatch<React.SetStateAction<LocalState>>
  onExit: () => void
}) {
  const [examQuestions] = useState(() => buildExam(questions, profile))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [answers, setAnswers] = useState<AttemptAnswer[]>([])
  const [seconds, setSeconds] = useState(profile.durationMinutes * 60)
  const [result, setResult] = useState<{ score: number; total: number } | null>(null)
  const startedAt = useRef(new Date().toISOString())
  const questionStartedAt = useRef(Date.now())

  const finish = (finalAnswers: AttemptAnswer[]) => {
    const score = finalAnswers.filter((answer) => answer.correct).length
    const attempt: MockAttempt = {
      id: crypto.randomUUID(),
      startedAt: startedAt.current,
      finishedAt: new Date().toISOString(),
      score,
      total: examQuestions.length,
      answers: finalAnswers,
      profileName: `${profile.questionCount} câu - ${profile.durationMinutes} phút`,
    }
    setState((current) => {
      const progress = { ...current.progress }
      for (const answer of finalAnswers) {
        const questionItem = questions.find((item) => item.id === answer.questionId)!
        progress[answer.questionId] = recordAnswer(
          progress[answer.questionId],
          questionItem,
          answer.correct,
          false,
          answer.responseMs,
        )
      }
      return {
        ...current,
        progress,
        attempts: [attempt, ...current.attempts].slice(0, 20),
        lastUpdatedAt: new Date().toISOString(),
      }
    })
    setResult({ score, total: examQuestions.length })
  }

  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          finish(answers)
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [answers, result])

  if (result) {
    const percentage = Math.round((result.score / result.total) * 100)
    return (
      <main className="center-page">
        <div className="completion-card result-card">
          <span className="eyebrow">Kết quả bài thi</span>
          <strong className="big-score">{result.score} / {result.total}</strong>
          <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-main)', marginBottom: '6px' }}>
            Đạt {percentage}% tổng số câu hỏi
          </p>
          <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginBottom: '20px' }}>
            Đã hoàn thành và ghi nhận kết quả thi vào dữ liệu của bạn.
          </p>
          <button className="primary-button" onClick={onExit}>Về trang tổng quan</button>
        </div>
      </main>
    )
  }

  const question = examQuestions[index]
  const submitQuestion = () => {
    if (selected === null) return
    const answer: AttemptAnswer = {
      questionId: question.id,
      selected,
      correct: selected === question.answer,
      responseMs: Date.now() - questionStartedAt.current,
    }
    const updated = [...answers, answer]
    setAnswers(updated)
    if (index === examQuestions.length - 1) {
      finish(updated)
      return
    }
    setIndex((value) => value + 1)
    setSelected(null)
    questionStartedAt.current = Date.now()
  }

  return (
    <main className="study-shell exam-shell">
      <div className="study-header">
        <button className="back-button" onClick={onExit}>Dừng bài thi</button>
        <div className="timer" aria-label="Thời gian còn lại">
          <span>{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
        </div>
      </div>
      <QuestionCard
        question={question}
        position={index + 1}
        total={examQuestions.length}
        selected={selected}
        answered={false}
        unsure={false}
        examMode
        onSelect={setSelected}
        onToggleUnsure={() => undefined}
        onNext={submitQuestion}
      />
    </main>
  )
}

function AuthDialog({
  onClose,
  onSignedIn,
}: {
  onClose: () => void
  onSignedIn: (state: AuthState) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (event: React.FormEvent) => {
    event.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signIn(email, password)
      onSignedIn(await getAuthState())
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Không thể đăng nhập.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <form className="auth-dialog" onSubmit={submit} onMouseDown={(event) => event.stopPropagation()}>
        <button type="button" className="dialog-close" onClick={onClose}>×</button>
        <span className="eyebrow">Tài khoản & Đồng bộ</span>
        <h2>Tài khoản người học</h2>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '12px', lineHeight: 1.4 }}>
          Ứng dụng hiện lưu tiến độ làm bài trực tiếp trên thiết bị của bạn.
        </p>
        {supabase ? (
          <>
            <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>Mật khẩu<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {error && <div className="form-error">{error}</div>}
            <button className="primary-button" disabled={loading}>{loading ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
          </>
        ) : (
          <div className="form-error" style={{ background: 'var(--primary-soft)', color: 'var(--primary)', borderColor: 'var(--border)' }}>
            Tiến độ đang được lưu an toàn trên bộ nhớ thiết bị của bạn.
          </div>
        )}
      </form>
    </div>
  )
}

function Admin() {
  const [rows, setRows] = useState<Record<string, unknown>[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    loadAdminSummary()
      .then(setRows)
      .catch((reason) => setError(reason instanceof Error ? reason.message : 'Không tải được dữ liệu.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <main className="page-shell admin-page">
      <div className="admin-heading">
        <div><span className="eyebrow">Theo dõi nhóm học</span><h1>Tiến độ người học</h1></div>
        <button className="outline-button" onClick={() => window.print()}>In báo cáo</button>
      </div>
      {loading && <div className="panel">Đang tải dữ liệu…</div>}
      {error && <div className="panel form-error">{error}</div>}
      {!loading && !error && (
        <div className="panel table-wrap">
          <table>
            <thead><tr><th>Người học</th><th>Đã học</th><th>Đã vững</th><th>Câu trọng yếu</th><th>Hoạt động gần nhất</th></tr></thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.user_id)}>
                  <td><strong>{String(row.display_name || row.email || 'Người học')}</strong></td>
                  <td>{String(row.seen_questions || 0)}/150</td>
                  <td>{String(row.mastered_questions || 0)}</td>
                  <td>{String(row.critical_mastered || 0)}/6</td>
                  <td>{formatDate(String(row.last_active_at || ''))}</td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={5}>Chưa có dữ liệu người học.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </main>
  )
}

export default function App() {
  const [state, setState] = useState<LocalState>(INITIAL_STATE)
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>('home')
  const [studyQueue, setStudyQueue] = useState<Question[]>([])
  const [studyTitle, setStudyTitle] = useState('Phiên học')
  const [auth, setAuth] = useState<AuthState>({ session: null, user: null, role: 'learner', displayName: null })
  const [authOpen, setAuthOpen] = useState(false)
  const [examProfile, setExamProfile] = useState<ExamProfile>(DEFAULT_EXAM_PROFILE)
  const examPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    Promise.all([loadLocalState(), getAuthState()]).then(([local, authState]) => {
      setState(local)
      setAuth(authState)
      setLoaded(true)
      if (authState.user) {
        loadExamProfile().then((profile) => profile && setExamProfile(profile)).catch(() => undefined)
        loadRemoteProgress(authState.user.id).then((remote) => {
          setState((current) => ({
            ...current,
            progress: mergeProgress(current.progress, remote),
            lastUpdatedAt: new Date().toISOString(),
          }))
        }).catch(() => undefined)
      }
    })
  }, [])

  useEffect(() => {
    if (!loaded) return
    saveLocalState(state).catch(() => undefined)
  }, [loaded, state])

  useEffect(() => {
    if (!auth.user) return
    const interval = window.setInterval(() => {
      if (navigator.onLine) {
        Promise.all([
          syncProgress(auth.user!.id, state.progress),
          syncAttempts(auth.user!.id, state.attempts),
        ]).catch(() => undefined)
      }
    }, 30_000)
    return () => window.clearInterval(interval)
  }, [auth.user, state.progress])

  const startStudy = (mode: Exclude<StudyMode, 'exam'>) => {
    const queue = mode === 'today'
      ? buildTodayQueue(questions, state.progress)
      : selectModeQuestions(mode, questions, state.progress)
    if (!queue.length) {
      setStudyQueue(buildTodayQueue(questions, state.progress))
    } else {
      setStudyQueue(queue)
    }
    const titles: Record<Exclude<StudyMode, 'exam'>, string> = {
      today: 'Kế hoạch ôn tập',
      all: 'Toàn bộ 150 câu',
      weak: 'Củng cố câu yếu',
      critical: '6 câu trọng yếu (Điểm liệt)',
    }
    setStudyTitle(titles[mode])
    setView('study')
  }

  const startChapterStudy = (chapter: string) => {
    const chapterQuestions = questions.filter((question) => question.chapter === chapter)
    const queue = buildTodayQueue(chapterQuestions, state.progress, chapterQuestions.length)
    setStudyQueue(queue)
    setStudyTitle(`Luyện theo nhóm: ${chapter}`)
    setView('study')
  }

  const [currentModule, setCurrentModule] = useState<PortalModule>(PORTAL_MODULES[0])
  const [toastMessage, setToastMessage] = useState<string | null>(null)

  const handleSelectModule = (mod: PortalModule) => {
    if (mod.active) {
      setCurrentModule(mod)
    } else {
      setToastMessage(`Chuyên mục "${mod.title}" đang sẵn sàng để bạn bổ sung nội dung sau!`)
      setTimeout(() => setToastMessage(null), 4500)
    }
  }

  const handleStartExam = (questionCount: number, durationMinutes: number) => {
    setExamProfile({
      name: `Thi thử ${questionCount} câu`,
      questionCount,
      durationMinutes,
      passScore: null,
      criticalRule: 'unverified',
    })
    setView('exam')
  }

  const handleOpenExamFromNav = () => {
    if (view !== 'home') {
      setView('home')
    }
    setTimeout(() => {
      examPanelRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, 100)
  }

  const handleSignOut = async () => {
    await signOut().catch(() => undefined)
    setAuth({ session: null, user: null, role: 'learner', displayName: null })
    setView('home')
  }

  const handleSignedIn = async (nextAuth: AuthState) => {
    setAuth(nextAuth)
    if (!nextAuth.user) return
    loadExamProfile().then((profile) => profile && setExamProfile(profile)).catch(() => undefined)
    const remote = await loadRemoteProgress(nextAuth.user.id).catch(() => ({}))
    setState((current) => ({
      ...current,
      progress: mergeProgress(current.progress, remote),
      lastUpdatedAt: new Date().toISOString(),
    }))
  }

  if (!loaded) {
    return <div className="app-loading"><span className="brand-mark">K602</span><p>Đang chuẩn bị phiên học…</p></div>
  }

  return (
    <div className="app">
      {toastMessage && (
        <div className="toast-notification">
          <span>💡 {toastMessage}</span>
          <button onClick={() => setToastMessage(null)}>×</button>
        </div>
      )}
      <Header
        view={view}
        auth={auth}
        currentModule={currentModule}
        onSelectModule={handleSelectModule}
        onNavigate={setView}
        onOpenAuth={() => setAuthOpen(true)}
        onSignOut={handleSignOut}
      />
      {view === 'home' && (
        <Home
          state={state}
          currentModule={currentModule}
          onSelectModule={handleSelectModule}
          examPanelRef={examPanelRef}
          onStart={startStudy}
          onStartChapter={startChapterStudy}
          onStartExam={handleStartExam}
        />
      )}
      {view === 'study' && <Study queue={studyQueue} title={studyTitle} setState={setState} onExit={() => setView('home')} />}
      {view === 'exam' && <Exam state={state} profile={examProfile} setState={setState} onExit={() => setView('home')} />}
      {view === 'admin' && auth.role === 'admin' && <Admin />}
      {authOpen && <AuthDialog onClose={() => setAuthOpen(false)} onSignedIn={handleSignedIn} />}
      <MobileBottomNav
        view={view}
        role={auth.role}
        onNavigate={setView}
        onOpenExam={handleOpenExamFromNav}
        onOpenAuth={() => setAuthOpen(true)}
      />
    </div>
  )
}
