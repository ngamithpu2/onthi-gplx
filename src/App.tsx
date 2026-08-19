import { useEffect, useRef, useState } from 'react'
import { gplxA1Questions } from './modules/gplx-a1'
import { PORTAL_MODULES, type PortalModule } from './config/modules'
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

function Header({
  view,
  auth,
  currentModule,
  onSelectModule,
  onNavigate,
  onSignOut,
}: {
  view: View
  auth: AuthState
  currentModule: PortalModule
  onSelectModule: (mod: PortalModule) => void
  onNavigate: (view: View) => void
  onSignOut: () => void
}) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button className="brand" onClick={() => onNavigate('home')} aria-label="Về trang chủ K602 Portal">
          <strong className="brand-title">K602 Portal</strong>
        </button>

        <div className="module-selector-wrapper" ref={dropdownRef}>
          <button
            type="button"
            className={`module-selector-btn ${isOpen ? 'active' : ''}`}
            onClick={() => setIsOpen(!isOpen)}
            aria-expanded={isOpen}
            aria-label="Chọn bộ đề ôn luyện"
          >
            <span className="selector-icon">{currentModule.id === 'gplx-a1' ? '🛵' : '🎖️'}</span>
            <span className="selector-title">{currentModule.shortTitle}</span>
            <span className="selector-badge">{currentModule.badge}</span>
            <svg className={`selector-arrow ${isOpen ? 'open' : ''}`} viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {isOpen && (
            <div className="module-dropdown-menu">
              <div className="dropdown-menu-header">
                <span>DANH MỤC BỘ ĐỀ ÔN LUYỆN</span>
                <small>{PORTAL_MODULES.length} bộ đề sẵn có</small>
              </div>

              <div className="dropdown-menu-list">
                {PORTAL_MODULES.map((mod) => {
                  const isSelected = mod.id === currentModule.id
                  return (
                    <button
                      key={mod.id}
                      className={`dropdown-menu-item ${isSelected ? 'selected' : ''}`}
                      onClick={() => {
                        onSelectModule(mod)
                        setIsOpen(false)
                      }}
                    >
                      <div className="menu-item-icon">{mod.id === 'gplx-a1' ? '🛵' : '🎖️'}</div>
                      <div className="menu-item-content">
                        <strong>{mod.title}</strong>
                        <span>{mod.badge} • {mod.questionCount} câu trắc nghiệm</span>
                      </div>
                      {isSelected && (
                        <div className="menu-item-check">
                          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="dropdown-menu-footer">
                <span className="footer-hint">💡 Các bộ đề ôn luyện khác sẽ tiếp tục được mở rộng...</span>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="account-area">
        {auth.role === 'admin' && (
          <button className={`admin-nav-btn ${view === 'admin' ? 'active' : ''}`} onClick={() => onNavigate('admin')}>
            Quản trị
          </button>
        )}
        {auth.user && (
          <button className="account-button" onClick={onSignOut} title="Nhấn để đăng xuất">
            <span className="account-avatar">{(auth.displayName || auth.user.email || 'HV').slice(0, 2).toUpperCase()}</span>
            <span>{auth.displayName || auth.user.email}</span>
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
  questions,
  currentModule,
  state,
  examPanelRef,
  onStart,
  onStartChapter,
  onStartExam,
}: {
  questions: Question[]
  currentModule: PortalModule
  state: LocalState
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
    return Boolean(item?.seen && (item.lastResult === 'wrong' || item.markedUnsure))
  }).length
  const chapters = [...new Set(questions.map((question) => question.chapter))]

  return (
    <main className="page-shell">
      <section className="hero-grid">
        <div className="hero-card">
          <div>
            <div className="eyebrow">{currentModule.shortTitle}</div>
            <h1>{currentModule.title}</h1>
            <p>{currentModule.description}</p>
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
              <strong>Học toàn bộ {questions.length} câu</strong>
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
              <small>{readiness.criticalMastered}/{readiness.criticalTotal} câu đã vững kiến thức</small>
            </div>
            <span className="arrow-text">Vào học</span>
          </button>
        </section>
      </div>

      <section className="dashboard-grid">
        <article className="panel">
          <div className="panel-heading">
            <div>
              <h2>Các nhóm kiến thức</h2>
            </div>
            <span>{readiness.seen}/{questions.length} câu</span>
          </div>
          <div className="chapter-list">
            {chapters.map((chapter) => {
              const chapterQuestions = questions.filter((question) => question.chapter === chapter)
              const seenCount = chapterQuestions.filter(
                (question) => (state.progress[question.id]?.seen ?? 0) > 0,
              ).length
              const remainingCount = Math.max(0, chapterQuestions.length - seenCount)
              const percentLearned = Math.round((seenCount / chapterQuestions.length) * 100)
              const isComplete = percentLearned === 100
              const nextQuestionNum = Math.min(seenCount + 1, chapterQuestions.length)

              const fillBg = isComplete
                ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.14) 0%, rgba(37, 99, 235, 0.14) 100%)'
                : percentLearned > 0
                ? `linear-gradient(90deg, rgba(37, 99, 235, 0.12) 0%, rgba(6, 182, 212, 0.12) ${percentLearned}%, rgba(248, 250, 252, 1) ${percentLearned}%)`
                : '#ffffff'

              return (
                <button
                  type="button"
                  className={`chapter-row ${isComplete ? 'complete' : ''} ${percentLearned > 0 ? 'started' : ''}`}
                  style={{ background: fillBg }}
                  key={chapter}
                  onClick={() => onStartChapter(chapter)}
                  aria-label={`Luyện nhóm ${chapter}, đã học ${percentLearned}% (${seenCount} trên ${chapterQuestions.length} câu)`}
                >
                  <div className="chapter-row-header">
                    <strong>{chapter}</strong>
                    <span className={`chapter-percent ${isComplete ? 'complete' : percentLearned > 0 ? 'active' : ''}`}>
                      {percentLearned}% đã học
                    </span>
                  </div>
                  <div className="bar">
                    <i className={isComplete ? 'complete-bar' : ''} style={{ width: `${percentLearned}%` }} />
                  </div>
                  <div className="chapter-row-footer">
                    <span>{isComplete ? <>Đã hoàn thành: <b>{chapterQuestions.length}/{chapterQuestions.length} câu</b></> : <>Tiếp tục: <b>Câu {nextQuestionNum}/{chapterQuestions.length}</b></>}</span>
                    <span>{isComplete ? <b style={{ color: '#059669' }}>✓ Đạt yêu cầu</b> : <>Còn lại: <b>{remainingCount} câu</b></>}</span>
                  </div>
                </button>
              )
            })}
          </div>
        </article>

        <aside className="panel exam-panel" ref={examPanelRef}>
          <div className="exam-panel-header">
            <span className="eyebrow">Mô phỏng kỳ thi</span>
            <h2>Thi thử sát hạch</h2>
            <p>Bộ đề 50 câu hỏi trắc nghiệm trong thời gian 30 phút.</p>
          </div>

          <div className="exam-summary-strip" style={{ marginTop: '16px' }}>
            <div className="exam-summary-item">
              <span>Số câu hỏi</span>
              <strong>50 câu</strong>
            </div>
            <div className="exam-summary-item">
              <span>Thời gian</span>
              <strong>30 phút</strong>
            </div>
            <div className="exam-summary-item">
              <span>Lượt đã thi</span>
              <strong>{state.attempts.length} lượt</strong>
            </div>
          </div>

          <button
            className="primary-exam-button"
            onClick={() => onStartExam(50, 30)}
            style={{ marginTop: '20px' }}
          >
            Bắt đầu thi thử (50 câu - 30 phút)
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
  canPrev,
  canNext,
  onPrev,
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
  canPrev?: boolean
  canNext?: boolean
  onPrev?: () => void
  onSelect: (index: number) => void
  onToggleUnsure: () => void
  onNext: () => void
}) {
  return (
    <article className="question-card">
      <div className="question-topline">
        <span className="question-index-badge">Câu {position} / {total} (Mã #{question.id})</span>
        <div className="question-badges">
          {question.critical && <b className="critical-badge">★ Câu trọng yếu (Điểm liệt)</b>}
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
              disabled={answered && !examMode}
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
          <strong>{selected === question.answer ? '✓ Chính xác' : '✗ Chưa chính xác'}</strong>
          <p style={{ marginTop: '4px' }}><strong>Đáp án đúng:</strong> {question.options[question.answer]}</p>
        </div>
      )}

      {answered && examMode && (
        <div className={`feedback-box ${selected === question.answer ? 'success' : 'error'}`}>
          <strong>{selected === question.answer ? '✓ Chính xác' : selected === -1 || selected === null ? '⚠️ Bạn chưa trả lời câu này' : '✗ Chưa chính xác'}</strong>
          <p style={{ marginTop: '4px' }}><strong>Đáp án đúng:</strong> {question.options[question.answer]}</p>
        </div>
      )}

      <div className="sticky-bottom-actions">
        {canPrev !== undefined && onPrev && (
          <button className="outline-button nav-prev-btn" disabled={!canPrev} onClick={onPrev}>
            ← Câu trước
          </button>
        )}
        <button
          className="primary-button nav-next-btn"
          disabled={!examMode && selected === null && !answered}
          onClick={onNext}
        >
          {examMode ? (position === total ? 'Nộp bài thi' : 'Câu tiếp theo →') : answered ? (position === total ? 'Hoàn thành' : 'Câu tiếp theo →') : 'Kiểm tra đáp án'}
        </button>
      </div>
    </article>
  )
}

function Study({
  queue,
  title,
  sessionKey,
  initialIndex = 0,
  setState,
  onExit,
}: {
  queue: Question[]
  title: string
  sessionKey?: string
  initialIndex?: number
  state: LocalState
  setState: React.Dispatch<React.SetStateAction<LocalState>>
  onExit: () => void
}) {
  const [items] = useState(queue)
  const [index, setIndex] = useState(() => Math.min(Math.max(0, initialIndex), Math.max(0, queue.length - 1)))
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, { selected: number; answered: boolean; correct: boolean }>>({})
  const [unsureMap, setUnsureMap] = useState<Record<number, boolean>>({})
  const startedAt = useRef(Date.now())

  useEffect(() => {
    setIndex(Math.min(Math.max(0, initialIndex), Math.max(0, queue.length - 1)))
  }, [initialIndex])

  const currentIndex = Math.min(Math.max(0, index), items.length - 1)
  const question = items[currentIndex]

  const updateSavedIndex = (newIdx: number) => {
    if (sessionKey) {
      setState((current) => ({
        ...current,
        sessionProgress: {
          ...(current.sessionProgress || {}),
          [sessionKey]: newIdx,
        },
        lastUpdatedAt: new Date().toISOString(),
      }))
    }
  }

  const currentAnswerState = question ? selectedAnswers[question.id] : undefined
  const selected = currentAnswerState ? currentAnswerState.selected : null
  const answered = currentAnswerState ? currentAnswerState.answered : false
  const unsure = question ? (unsureMap[question.id] ?? false) : false

  const goToIndex = (newIdx: number) => {
    const clamped = Math.max(0, Math.min(newIdx, items.length - 1))
    setIndex(clamped)
    updateSavedIndex(clamped)
    startedAt.current = Date.now()
  }

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ('1234'.includes(event.key) && !answered && question) {
        const option = Number(event.key) - 1
        if (option < question.options.length) {
          setSelectedAnswers((prev) => ({
            ...prev,
            [question.id]: { selected: option, answered: false, correct: false },
          }))
        }
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        goToIndex(currentIndex - 1)
      } else if (event.key === 'ArrowRight' && currentIndex < items.length - 1 && answered) {
        goToIndex(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [answered, question, currentIndex, items.length])

  const handleSelect = (optionIndex: number) => {
    if (!question || answered) return
    setSelectedAnswers((prev) => ({
      ...prev,
      [question.id]: { selected: optionIndex, answered: false, correct: false },
    }))
  }

  const handleToggleUnsure = () => {
    if (!question) return
    setUnsureMap((prev) => ({ ...prev, [question.id]: !prev[question.id] }))
  }

  const handleCheckOrNext = () => {
    if (!question || selected === null) return

    if (!answered) {
      const correct = selected === question.answer
      const responseMs = Date.now() - startedAt.current
      const nextIdxToSave = Math.min(currentIndex + 1, items.length - 1)

      setSelectedAnswers((prev) => ({
        ...prev,
        [question.id]: { selected, answered: true, correct },
      }))

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
        sessionProgress: {
          ...(current.sessionProgress || {}),
          ...(sessionKey ? { [sessionKey]: nextIdxToSave } : {}),
        },
        lastUpdatedAt: new Date().toISOString(),
      }))
      return
    }

    if (currentIndex < items.length - 1) {
      goToIndex(currentIndex + 1)
    }
  }

  const handleRestart = () => {
    if (window.confirm('Bạn có muốn học lại phần này từ câu đầu tiên không?')) {
      setSelectedAnswers({})
      goToIndex(0)
    }
  }

  if (!question) {
    return (
      <main className="center-page">
        <div className="completion-card">
          <span className="eyebrow">Chúc mừng</span>
          <h1>Hoàn thành phiên học</h1>
          <p style={{ margin: '12px 0 24px', color: 'var(--text-muted)' }}>
            Bạn đã hoàn thành toàn bộ {items.length} câu hỏi trong phiên học này.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button className="outline-button" onClick={handleRestart}>Học lại từ đầu</button>
            <button className="primary-button" onClick={onExit}>Về trang tổng quan</button>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="study-shell">
      <div className="study-header">
        <button className="back-button" onClick={onExit}>← Thoát</button>
        <div className="study-session-meta">
          <strong>{title}</strong>
        </div>
      </div>

      <QuestionCard
        question={question}
        position={currentIndex + 1}
        total={items.length}
        selected={selected}
        answered={answered}
        unsure={unsure}
        examMode={false}
        canPrev={currentIndex > 0}
        canNext={currentIndex < items.length - 1}
        onPrev={() => goToIndex(currentIndex - 1)}
        onSelect={handleSelect}
        onToggleUnsure={handleToggleUnsure}
        onNext={handleCheckOrNext}
      />
    </main>
  )
}

function Exam({
  questions,
  profile,
  setState,
  onExit,
}: {
  questions: Question[]
  state: LocalState
  profile: ExamProfile
  setState: React.Dispatch<React.SetStateAction<LocalState>>
  onExit: () => void
}) {
  const [examQuestions, setExamQuestions] = useState(() => buildExam(questions, profile))
  const [index, setIndex] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({})
  const [seconds, setSeconds] = useState(profile.durationMinutes * 60)
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [result, setResult] = useState<{
    score: number
    total: number
    passed: boolean
    criticalFailed: boolean
    criticalFailedCount: number
    answeredCount: number
    durationUsedSeconds: number
  } | null>(null)

  const startedAt = useRef(new Date().toISOString())
  const questionStartedAt = useRef(Date.now())
  const questionTimes = useRef<Record<number, number>>({})
  const matrixScrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setExamQuestions(buildExam(questions, profile))
    setIndex(0)
    setSelectedAnswers({})
    setSeconds(profile.durationMinutes * 60)
    setShowConfirmSubmit(false)
    setReviewMode(false)
    setResult(null)
    startedAt.current = new Date().toISOString()
    questionStartedAt.current = Date.now()
    questionTimes.current = {}
  }, [profile, questions])

  const currentIndex = Math.min(Math.max(0, index), examQuestions.length - 1)
  const question = examQuestions[currentIndex]

  useEffect(() => {
    if (matrixScrollRef.current) {
      const activeBtn = matrixScrollRef.current.children[currentIndex] as HTMLElement
      if (activeBtn) {
        activeBtn.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }
  }, [currentIndex])

  const finishExam = () => {
    const durationUsedSeconds = profile.durationMinutes * 60 - seconds
    const finalAnswers: AttemptAnswer[] = examQuestions.map((q) => {
      const chosen = selectedAnswers[q.id]
      const isCorrect = chosen !== undefined && chosen === q.answer
      return {
        questionId: q.id,
        selected: chosen !== undefined ? chosen : -1,
        correct: isCorrect,
        responseMs: questionTimes.current[q.id] || 0,
      }
    })

    const score = finalAnswers.filter((a) => a.correct).length
    const answeredCount = Object.keys(selectedAnswers).length

    // Check critical questions
    const criticalQuestions = examQuestions.filter((q) => q.critical)
    const criticalFailedCount = criticalQuestions.filter(
      (q) => selectedAnswers[q.id] === undefined || selectedAnswers[q.id] !== q.answer,
    ).length
    const criticalFailed = criticalFailedCount > 0

    // Standard A1 rule: >= 84% pass rate and NO critical questions wrong
    const passThreshold = Math.ceil(examQuestions.length * 0.84)
    const passed = score >= passThreshold && !criticalFailed

    const attemptId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `att-${Date.now()}`
    const attempt: MockAttempt = {
      id: attemptId,
      startedAt: startedAt.current,
      finishedAt: new Date().toISOString(),
      score,
      total: examQuestions.length,
      answers: finalAnswers,
      profileName: `${profile.questionCount} câu - ${profile.durationMinutes} phút`,
    }

    setState((current) => {
      const progress = { ...current.progress }
      for (const ans of finalAnswers) {
        const questionItem = questions.find((item) => item.id === ans.questionId)
        if (questionItem) {
          progress[ans.questionId] = recordAnswer(
            progress[ans.questionId],
            questionItem,
            ans.correct,
            false,
            ans.responseMs,
          )
        }
      }
      return {
        ...current,
        progress,
        attempts: [attempt, ...current.attempts].slice(0, 20),
        lastUpdatedAt: new Date().toISOString(),
      }
    })

    setResult({
      score,
      total: examQuestions.length,
      passed,
      criticalFailed,
      criticalFailedCount,
      answeredCount,
      durationUsedSeconds,
    })
    setShowConfirmSubmit(false)
  }

  // Timer countdown
  useEffect(() => {
    if (result) return
    const timer = window.setInterval(() => {
      setSeconds((value) => {
        if (value <= 1) {
          window.clearInterval(timer)
          finishExam()
          return 0
        }
        return value - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [result])

  const handleSelect = (optionIdx: number) => {
    if (!question || result) return
    const elapsed = Date.now() - questionStartedAt.current
    questionTimes.current[question.id] = (questionTimes.current[question.id] || 0) + elapsed
    questionStartedAt.current = Date.now()
    setSelectedAnswers((prev) => ({ ...prev, [question.id]: optionIdx }))
  }

  const goToQuestion = (targetIdx: number) => {
    if (question) {
      const elapsed = Date.now() - questionStartedAt.current
      questionTimes.current[question.id] = (questionTimes.current[question.id] || 0) + elapsed
    }
    setIndex(Math.max(0, Math.min(targetIdx, examQuestions.length - 1)))
    questionStartedAt.current = Date.now()
  }

  // Keyboard shortcut support in Exam mode
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ('1234'.includes(event.key) && !result && !reviewMode && question) {
        const option = Number(event.key) - 1
        if (option < question.options.length) {
          handleSelect(option)
        }
      } else if (event.key === 'ArrowLeft' && currentIndex > 0) {
        goToQuestion(currentIndex - 1)
      } else if (event.key === 'ArrowRight' && currentIndex < examQuestions.length - 1) {
        goToQuestion(currentIndex + 1)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [result, reviewMode, question, currentIndex, examQuestions.length])

  const handleRestartExam = () => {
    const newQuestions = buildExam(questions, profile)
    setExamQuestions(newQuestions)
    setIndex(0)
    setSelectedAnswers({})
    setSeconds(profile.durationMinutes * 60)
    setResult(null)
    setReviewMode(false)
    startedAt.current = new Date().toISOString()
    questionStartedAt.current = Date.now()
    questionTimes.current = {}
  }

  // Results screen
  if (result && !reviewMode) {
    const percentage = Math.round((result.score / result.total) * 100)
    const minutesUsed = Math.floor(result.durationUsedSeconds / 60)
    const secondsUsed = result.durationUsedSeconds % 60

    return (
      <main className="center-page">
        <div className={`completion-card result-card ${result.passed ? 'passed' : 'failed'}`}>
          <div className="exam-result-header">
            <span className={`exam-status-badge ${result.passed ? 'pass-badge' : 'fail-badge'}`}>
              {result.passed ? '✓ ĐẠT YÊU CẦU' : '✗ CHƯA ĐẠT'}
            </span>
            {result.criticalFailed && (
              <div className="critical-warning-box">
                ⚠️ Bạn đã làm sai {result.criticalFailedCount} câu điểm liệt (câu trọng yếu). Theo quy chế sát hạch, bài thi bị đánh trượt.
              </div>
            )}
          </div>

          <div className="exam-big-score-wrap">
            <strong className="big-score">{result.score} / {result.total}</strong>
            <span className="big-score-sub">{percentage}% tổng điểm (Yêu cầu: ≥ 84%)</span>
          </div>

          <div className="exam-breakdown-grid">
            <div className="breakdown-box">
              <span className="label">Số câu đúng</span>
              <strong className="value text-success">{result.score}</strong>
            </div>
            <div className="breakdown-box">
              <span className="label">Số câu sai</span>
              <strong className="value text-danger">{result.answeredCount - result.score}</strong>
            </div>
            <div className="breakdown-box">
              <span className="label">Chưa làm</span>
              <strong className="value text-muted">{result.total - result.answeredCount}</strong>
            </div>
            <div className="breakdown-box">
              <span className="label">Thời gian thi</span>
              <strong className="value">{minutesUsed}p {secondsUsed}s</strong>
            </div>
          </div>

          <div className="exam-result-actions">
            <button className="primary-button" onClick={() => setReviewMode(true)}>
              🔍 Xem lại bài làm chi tiết
            </button>
            <button className="outline-button" onClick={handleRestartExam}>
              🔄 Thi đề mới
            </button>
            <button className="subtle-button" onClick={onExit}>
              Về trang chủ
            </button>
          </div>
        </div>
      </main>
    )
  }

  const selected = question ? (selectedAnswers[question.id] ?? null) : null
  const unansweredCount = examQuestions.length - Object.keys(selectedAnswers).length

  return (
    <main className="study-shell exam-shell">
      <div className="study-header exam-top-header">
        <button
          className="back-button"
          onClick={() => {
            if (reviewMode) {
              setReviewMode(false)
            } else if (window.confirm('Bạn có chắc muốn thoát và dừng bài thi này?')) {
              onExit()
            }
          }}
        >
          {reviewMode ? '← Bảng kết quả' : 'Dừng bài thi'}
        </button>

        {!reviewMode && (
          <div className={`timer ${seconds < 120 ? 'timer-warning' : ''}`} aria-label="Thời gian còn lại">
            <span>⏱️ {String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</span>
          </div>
        )}

        {reviewMode ? (
          <div className="review-mode-indicator">
            <span className="badge-review">Chế độ xem lại bài thi</span>
          </div>
        ) : (
          <button className="submit-exam-btn" onClick={() => setShowConfirmSubmit(true)}>
            Nộp bài
          </button>
        )}
      </div>

      {/* Exam Question Matrix Navigation Bar */}
      <div className="exam-matrix-bar">
        <div className="exam-matrix-scroll" ref={matrixScrollRef}>
          {examQuestions.map((q, idx) => {
            const isAnswered = selectedAnswers[q.id] !== undefined
            const isCurrent = idx === currentIndex
            let chipClass = 'exam-nav-chip'
            if (isCurrent) chipClass += ' active'

            if (reviewMode) {
              const ans = selectedAnswers[q.id]
              const isCorrect = ans !== undefined && ans === q.answer
              chipClass += isCorrect ? ' correct' : ' wrong'
            } else if (isAnswered) {
              chipClass += ' answered'
            }

            return (
              <button
                key={q.id}
                className={chipClass}
                onClick={() => goToQuestion(idx)}
                title={`Câu ${idx + 1}${q.critical ? ' (Điểm liệt)' : ''}`}
              >
                <span>{idx + 1}</span>
                {q.critical && <b className="critical-star">★</b>}
              </button>
            )
          })}
        </div>
      </div>

      {question && (
        <QuestionCard
          question={question}
          position={currentIndex + 1}
          total={examQuestions.length}
          selected={selected}
          answered={reviewMode}
          unsure={false}
          examMode={!reviewMode}
          canPrev={currentIndex > 0}
          canNext={currentIndex < examQuestions.length - 1}
          onPrev={() => goToQuestion(currentIndex - 1)}
          onNext={() => {
            if (reviewMode) {
              if (currentIndex < examQuestions.length - 1) {
                goToQuestion(currentIndex + 1)
              } else {
                setReviewMode(false)
              }
            } else {
              if (currentIndex < examQuestions.length - 1) {
                goToQuestion(currentIndex + 1)
              } else {
                setShowConfirmSubmit(true)
              }
            }
          }}
          onSelect={handleSelect}
          onToggleUnsure={() => undefined}
        />
      )}

      {/* Confirm Submission Dialog */}
      {showConfirmSubmit && (
        <div className="dialog-backdrop" onClick={() => setShowConfirmSubmit(false)}>
          <div className="auth-dialog confirm-submit-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>Xác nhận nộp bài thi</h3>
            {unansweredCount > 0 ? (
              <div className="form-error" style={{ background: '#fffbeb', borderColor: '#fde68a', color: '#92400e', margin: '12px 0' }}>
                ⚠️ <strong>Lưu ý:</strong> Bạn vẫn còn <strong>{unansweredCount} câu</strong> chưa chọn đáp án!
              </div>
            ) : (
              <p style={{ margin: '12px 0', color: 'var(--text-muted)' }}>
                Bạn đã trả lời đầy đủ {examQuestions.length}/{examQuestions.length} câu hỏi. Bạn có chắc chắn muốn nộp bài thi?
              </p>
            )}
            <div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}>
              <button className="outline-button" style={{ flex: 1 }} onClick={() => setShowConfirmSubmit(false)}>
                Làm tiếp
              </button>
              <button className="primary-button" style={{ flex: 1 }} onClick={finishExam}>
                Xác nhận nộp
              </button>
            </div>
          </div>
        </div>
      )}
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
  const [currentModule, setCurrentModule] = useState<PortalModule>(PORTAL_MODULES[0])
  const questions = gplxA1Questions

  const [state, setState] = useState<LocalState>(INITIAL_STATE)
  const [loaded, setLoaded] = useState(false)
  const [view, setView] = useState<View>('home')
  const [studyQueue, setStudyQueue] = useState<Question[]>([])
  const [studyTitle, setStudyTitle] = useState('Phiên học')
  const [studySessionKey, setStudySessionKey] = useState<string>('')
  const [studyInitialIndex, setStudyInitialIndex] = useState<number>(0)
  const [auth, setAuth] = useState<AuthState>({ session: null, user: null, role: 'learner', displayName: null })
  const [authOpen, setAuthOpen] = useState(false)
  const [examProfile, setExamProfile] = useState<ExamProfile>(DEFAULT_EXAM_PROFILE)
  const [examSessionId, setExamSessionId] = useState(0)
  const examPanelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLoaded(false)
    Promise.all([loadLocalState(currentModule.id), getAuthState()]).then(([local, authState]) => {
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
  }, [currentModule.id])

  useEffect(() => {
    if (!loaded) return
    saveLocalState(state, currentModule.id).catch(() => undefined)
  }, [loaded, state, currentModule.id])

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
    const key = `mode:${mode}`
    let queue: Question[] = []
    if (mode === 'all') {
      queue = [...questions]
    } else if (mode === 'today') {
      queue = buildTodayQueue(questions, state.progress)
    } else {
      queue = selectModeQuestions(mode, questions, state.progress)
    }
    if (!queue.length) {
      queue = buildTodayQueue(questions, state.progress)
    }
    const seenCount = queue.filter(
      (question) => (state.progress[question.id]?.seen ?? 0) > 0,
    ).length
    const initialIdx = Math.min(seenCount, queue.length - 1)

    const titles: Record<Exclude<StudyMode, 'exam'>, string> = {
      today: 'Kế hoạch ôn tập',
      all: `Toàn bộ ${questions.length} câu`,
      weak: 'Củng cố câu hay làm sai',
      critical: 'Câu trọng yếu (Điểm liệt)',
    }
    setStudyQueue(queue)
    setStudySessionKey(key)
    setStudyInitialIndex(initialIdx)
    setStudyTitle(titles[mode])
    setView('study')
  }

  const startChapterStudy = (chapter: string) => {
    const chapterQuestions = questions.filter((question) => question.chapter === chapter)
    const key = `chapter:${chapter}`
    const seenCount = chapterQuestions.filter(
      (question) => (state.progress[question.id]?.seen ?? 0) > 0,
    ).length
    const initialIdx = Math.min(seenCount, chapterQuestions.length - 1)

    setStudyQueue(chapterQuestions)
    setStudySessionKey(key)
    setStudyInitialIndex(initialIdx)
    setStudyTitle(`Luyện theo nhóm: ${chapter}`)
    setView('study')
  }

  const handleStartExam = (questionCount: number, durationMinutes: number) => {
    setExamProfile({
      name: `Thi thử ${questionCount} câu`,
      questionCount,
      durationMinutes,
      passScore: null,
      criticalRule: 'unverified',
    })
    setExamSessionId((prev) => prev + 1)
    setView('exam')
  }

  const handleOpenExamFromNav = () => {
    handleStartExam(50, 30)
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

  const handleSelectModule = async (mod: PortalModule) => {
    if (mod.id === currentModule.id) return
    saveLocalState(state, currentModule.id).catch(() => undefined)
    const newLocal = await loadLocalState(mod.id).catch(() => INITIAL_STATE)
    setState(newLocal)
    setCurrentModule(mod)
    setView('home')
  }

  if (!loaded) {
    return <div className="app-loading"><span className="brand-mark">K602</span><p>Đang chuẩn bị phiên học…</p></div>
  }

  return (
    <div className="app">
      <Header
        view={view}
        auth={auth}
        currentModule={currentModule}
        onSelectModule={handleSelectModule}
        onNavigate={setView}
        onSignOut={handleSignOut}
      />
      {view === 'home' && (
        <Home
          questions={questions}
          currentModule={currentModule}
          state={state}
          examPanelRef={examPanelRef}
          onStart={startStudy}
          onStartChapter={startChapterStudy}
          onStartExam={handleStartExam}
        />
      )}
      {view === 'study' && (
        <Study
          queue={studyQueue}
          title={studyTitle}
          sessionKey={studySessionKey}
          initialIndex={studyInitialIndex}
          state={state}
          setState={setState}
          onExit={() => setView('home')}
        />
      )}
      {view === 'exam' && (
        <Exam
          key={`exam-session-${examSessionId}`}
          questions={questions}
          state={state}
          profile={examProfile}
          setState={setState}
          onExit={() => setView('home')}
        />
      )}
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
