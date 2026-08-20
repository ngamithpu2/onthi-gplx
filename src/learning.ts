import type { ExamProfile, Question, QuestionProgress } from './types'

const DAY = 24 * 60 * 60 * 1000

export const DEFAULT_EXAM_PROFILE: ExamProfile = {
  name: 'Mô phỏng kỳ thi (50 câu)',
  questionCount: 50,
  durationMinutes: 30,
  passScore: 42,
  criticalRule: 'unverified',
}

export function emptyProgress(questionId: number): QuestionProgress {
  return {
    questionId,
    seen: 0,
    correct: 0,
    wrong: 0,
    streak: 0,
    mastery: 0,
    lastSeen: null,
    nextDue: null,
    lastResult: null,
    lastResponseMs: null,
    markedUnsure: false,
  }
}

function seededSort<T>(items: T[], seed = Date.now()): T[] {
  let value = seed % 2147483647
  const random = () => {
    value = (value * 16807) % 2147483647
    return (value - 1) / 2147483646
  }
  return [...items]
    .map((item) => ({ item, order: random() }))
    .sort((a, b) => a.order - b.order)
    .map(({ item }) => item)
}

function uniqueQuestions(groups: Question[][]): Question[] {
  const seen = new Set<number>()
  return groups.flat().filter((question) => {
    if (seen.has(question.id)) return false
    seen.add(question.id)
    return true
  })
}

export function buildTodayQueue(
  questions: Question[],
  progress: Record<number, QuestionProgress>,
  limit = 20,
): Question[] {
  const now = Date.now()
  const due = questions
    .filter((question) => {
      const item = progress[question.id]
      return item?.nextDue && new Date(item.nextDue).getTime() <= now
    })
    .sort((a, b) => {
      const left = new Date(progress[a.id].nextDue ?? 0).getTime()
      const right = new Date(progress[b.id].nextDue ?? 0).getTime()
      return left - right
    })
  const weak = questions
    .filter((question) => {
      const item = progress[question.id]
      return Boolean(item && item.lastResult === 'wrong')
    })
    .sort((a, b) => (progress[a.id]?.mastery ?? 0) - (progress[b.id]?.mastery ?? 0))
  const unseen = seededSort(
    questions.filter((question) => !progress[question.id]?.seen),
    new Date().getDate() + new Date().getMonth() * 31,
  )
  const critical = questions.filter(
    (question) => question.critical && (progress[question.id]?.mastery ?? 0) < 3,
  )

  const desiredDue = Math.ceil(limit * 0.5)
  const desiredWeak = Math.ceil(limit * 0.3)
  const queue = uniqueQuestions([
    due.slice(0, desiredDue),
    weak.slice(0, desiredWeak),
    critical,
    unseen,
    due,
    weak,
    questions,
  ])
  return queue.slice(0, limit)
}

export function selectModeQuestions(
  mode: 'all' | 'weak' | 'critical',
  questions: Question[],
  progress: Record<number, QuestionProgress>,
): Question[] {
  if (mode === 'critical') return questions.filter((question) => question.critical)
  if (mode === 'weak') {
    return questions.filter((question) => {
      const item = progress[question.id]
      return Boolean(item && item.lastResult === 'wrong')
    })
  }
  return questions
}

export function calculateExamDuration(_questionCount?: number): number {
  return 30
}

export function buildExam(
  questions: Question[],
  _profileOrCount?: ExamProfile | number,
): Question[] {
  const targetTotal = 50
  const safeTotal = Math.min(targetTotal, questions.length)

  const allCritical = seededSort(questions.filter((q) => q.critical))
  const allRegular = seededSort(questions.filter((q) => !q.critical))

  // Pick at least 4 critical questions
  const minCritical = Math.min(allCritical.length, 4)
  const criticalCount = Math.min(
    allCritical.length,
    Math.max(minCritical, Math.floor(Math.random() * (allCritical.length - minCritical + 1)) + minCritical),
  )

  const chosenCritical = allCritical.slice(0, criticalCount)
  const regularNeeded = safeTotal - chosenCritical.length
  const chosenRegular = allRegular.slice(0, regularNeeded)

  // Shuffle all together
  return seededSort([...chosenCritical, ...chosenRegular]).slice(0, safeTotal)
}

export function recordAnswer(
  current: QuestionProgress | undefined,
  question: Question,
  correct: boolean,
  unsure: boolean,
  responseMs: number,
): QuestionProgress {
  const previous = current ?? emptyProgress(question.id)
  const effectiveCorrect = correct && !unsure
  const streak = effectiveCorrect ? previous.streak + 1 : 0
  const mastery = effectiveCorrect
    ? Math.min(5, previous.mastery + 1)
    : Math.max(0, previous.mastery - 1)
  const intervals = [0, 1, 3, 7, 14, 30]
  let intervalDays = effectiveCorrect ? intervals[Math.min(mastery, 5)] : 0
  if (question.critical && streak < 3) intervalDays = Math.min(intervalDays || 1, 1)
  const nextDue = effectiveCorrect
    ? new Date(Date.now() + intervalDays * DAY).toISOString()
    : new Date(Date.now() + 5 * 60 * 1000).toISOString()

  return {
    ...previous,
    seen: previous.seen + 1,
    correct: previous.correct + (correct ? 1 : 0),
    wrong: previous.wrong + (correct ? 0 : 1),
    streak,
    mastery,
    lastSeen: new Date().toISOString(),
    nextDue,
    lastResult: correct ? 'correct' : 'wrong',
    lastResponseMs: responseMs,
    markedUnsure: unsure,
  }
}

export function getReadiness(
  questions: Question[],
  progress: Record<number, QuestionProgress>,
) {
  const seen = questions.filter((question) => (progress[question.id]?.seen ?? 0) > 0).length
  const mastered = questions.filter((question) => (progress[question.id]?.mastery ?? 0) >= 3).length
  const critical = questions.filter((question) => question.critical)
  const criticalMastered = critical.filter(
    (question) => (progress[question.id]?.mastery ?? 0) >= 3,
  ).length
  const score = questions.length > 0 ? Math.min(100, Math.max(0, Math.round((seen / questions.length) * 100))) : 0
  return { score, seen, mastered, criticalMastered, criticalTotal: critical.length }
}
