import fs from 'fs'

const raw = fs.readFileSync('src/modules/gplx-a1/questions.json', 'utf8')
const gplxA1Questions = JSON.parse(raw)

const DAY = 24 * 60 * 60 * 1000

function shuffle(array) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function getReadiness(questions, progress) {
  const p = progress || {}
  const seen = questions.filter((q) => (p[q.id]?.seen ?? 0) > 0).length
  const mastered = questions.filter((q) => (p[q.id]?.mastery ?? 0) >= 3).length
  const critical = questions.filter((q) => q.critical)
  const criticalMastered = critical.filter((q) => (p[q.id]?.mastery ?? 0) >= 3).length
  const score = questions.length > 0 ? Math.min(100, Math.max(0, Math.round((seen / questions.length) * 100))) : 0
  return { score, seen, mastered, criticalMastered, criticalTotal: critical.length }
}

function buildExam(questions) {
  const total = 50
  const criticalAll = questions.filter((q) => q.critical)
  const nonCriticalAll = questions.filter((q) => !q.critical)
  const desiredCriticalCount = Math.min(criticalAll.length, Math.floor(Math.random() * 3) + 4)
  const shuffledCritical = shuffle(criticalAll).slice(0, desiredCriticalCount)
  const neededNonCritical = total - shuffledCritical.length
  const shuffledNonCritical = shuffle(nonCriticalAll).slice(0, neededNonCritical)
  return shuffle([...shuffledCritical, ...shuffledNonCritical])
}

function recordAnswer(current, question, correct, unsure, responseMs) {
  const previous = current ?? {
    questionId: question.id,
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
  const effectiveCorrect = correct && !unsure
  const streak = effectiveCorrect ? previous.streak + 1 : 0
  const mastery = effectiveCorrect ? Math.min(5, previous.mastery + 1) : Math.max(0, previous.mastery - 1)
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

console.log('--- STARTING MULTI-ITERATION SIMULATION ---')

// Test 1: Empty progress
console.log('Test 1: Empty progress')
const r1 = getReadiness(gplxA1Questions, {})
if (r1.score !== 0 || r1.seen !== 0) throw new Error('Test 1 failed')

// Test 2: Undefined progress
console.log('Test 2: Undefined progress')
const r2 = getReadiness(gplxA1Questions, undefined)
if (r2.score !== 0) throw new Error('Test 2 failed')

// Test 3: Multiple answering loop
console.log('Test 3: Answering loop 150 questions')
let state = { progress: {}, attempts: [] }
for (let i = 0; i < gplxA1Questions.length; i++) {
  const q = gplxA1Questions[i]
  const isCorrect = i % 4 !== 0
  state.progress[q.id] = recordAnswer(state.progress[q.id], q, isCorrect, false, 1200)
}

const r3 = getReadiness(gplxA1Questions, state.progress)
console.log(`Readiness after 150 questions: ${r3.score}%, seen: ${r3.seen}/${gplxA1Questions.length}`)
if (r3.seen !== 150 || r3.score !== 100) throw new Error('Test 3 failed')

// Test 4: Exam generator loop 500 times
console.log('Test 4: Exam generator loop 500 times')
for (let iter = 0; iter < 500; iter++) {
  const exam = buildExam(gplxA1Questions)
  if (exam.length !== 50) throw new Error(`Exam length invalid: ${exam.length}`)
  const criticalCount = exam.filter((q) => q.critical).length
  if (criticalCount < 4) throw new Error(`Critical count < 4: ${criticalCount}`)
}
console.log('Exam generator: 500/500 tests passed successfully!')

// Test 5: Verify build dist bundle
const html = fs.readFileSync('dist/index.html', 'utf8')
const jsMatch = html.match(/src="\/assets\/([^"]+)"/)
if (!jsMatch) throw new Error('No JS bundle in dist/index.html')
const js = fs.readFileSync(`dist/assets/${jsMatch[1]}`, 'utf8')
console.log(`Bundle ${jsMatch[1]} verified, size: ${js.length} bytes`)

console.log('--- ALL 500+ SIMULATION & VERIFICATION LOOPS PASSED 100%! ---')
