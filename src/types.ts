export type Question = {
  id: number
  question: string
  options: string[]
  answer: number
  chapter: string
  image: string | null
  critical: boolean
}

export type QuestionProgress = {
  questionId: number
  seen: number
  correct: number
  wrong: number
  streak: number
  mastery: number
  lastSeen: string | null
  nextDue: string | null
  lastResult: 'correct' | 'wrong' | null
  lastResponseMs: number | null
  markedUnsure: boolean
}

export type AttemptAnswer = {
  questionId: number
  selected: number
  correct: boolean
  responseMs: number
}

export type MockAttempt = {
  id: string
  startedAt: string
  finishedAt: string
  score: number
  total: number
  answers: AttemptAnswer[]
  profileName: string
}

export type LocalState = {
  version: 1
  progress: Record<number, QuestionProgress>
  attempts: MockAttempt[]
  lastUpdatedAt: string
}

export type ExamProfile = {
  name: string
  questionCount: number
  durationMinutes: number
  passScore: number | null
  criticalRule: 'unverified' | 'none' | 'must-correct'
}

export type StudyMode = 'today' | 'all' | 'weak' | 'critical' | 'exam'
