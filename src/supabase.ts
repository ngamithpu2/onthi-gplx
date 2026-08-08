import { createClient, type Session, type User } from '@supabase/supabase-js'
import type { ExamProfile, MockAttempt, QuestionProgress } from './types'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

export const supabase = url && anonKey ? createClient(url, anonKey) : null

export type AuthState = {
  session: Session | null
  user: User | null
  role: 'learner' | 'admin'
  displayName: string | null
}

export async function getAuthState(): Promise<AuthState> {
  if (!supabase) return { session: null, user: null, role: 'learner', displayName: null }
  const { data } = await supabase.auth.getSession()
  const user = data.session?.user ?? null
  if (!user) return { session: data.session, user: null, role: 'learner', displayName: null }
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, display_name')
    .eq('id', user.id)
    .maybeSingle()
  return {
    session: data.session,
    user,
    role: profile?.role === 'admin' ? 'admin' : 'learner',
    displayName: profile?.display_name ?? null,
  }
}

export async function signIn(email: string, password: string) {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.')
  const result = await supabase.auth.signInWithPassword({ email, password })
  if (result.error) throw result.error
  return result.data
}

export async function signOut() {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function syncProgress(userId: string, progress: Record<number, QuestionProgress>) {
  if (!supabase) return
  const rows = Object.values(progress).map((item) => ({
    user_id: userId,
    question_id: item.questionId,
    seen_count: item.seen,
    correct_count: item.correct,
    wrong_count: item.wrong,
    streak: item.streak,
    mastery: item.mastery,
    last_seen_at: item.lastSeen,
    next_due_at: item.nextDue,
    last_result: item.lastResult,
    last_response_ms: item.lastResponseMs,
    marked_unsure: item.markedUnsure,
    updated_at: new Date().toISOString(),
  }))
  if (!rows.length) return
  const { error } = await supabase.from('question_progress').upsert(rows, {
    onConflict: 'user_id,question_id',
  })
  if (error) throw error
}

export async function syncAttempts(userId: string, attempts: MockAttempt[]) {
  if (!supabase || !attempts.length) return
  const rows = attempts.map((attempt) => ({
    id: attempt.id,
    user_id: userId,
    profile_name: attempt.profileName,
    score: attempt.score,
    total: attempt.total,
    answers: attempt.answers,
    started_at: attempt.startedAt,
    finished_at: attempt.finishedAt,
  }))
  const { error } = await supabase.from('mock_attempts').upsert(rows, { onConflict: 'id' })
  if (error) throw error
}

export async function loadExamProfile(): Promise<ExamProfile | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('exam_profiles')
    .select('name, question_count, duration_minutes, pass_score, critical_rule')
    .eq('active', true)
    .maybeSingle()
  if (error || !data) return null
  return {
    name: data.name,
    questionCount: data.question_count,
    durationMinutes: data.duration_minutes,
    passScore: data.pass_score,
    criticalRule: data.critical_rule,
  }
}

export async function loadRemoteProgress(userId: string): Promise<Record<number, QuestionProgress>> {
  if (!supabase) return {}
  const { data, error } = await supabase
    .from('question_progress')
    .select('*')
    .eq('user_id', userId)
  if (error) throw error
  return Object.fromEntries(
    (data ?? []).map((row) => [
      row.question_id,
      {
        questionId: row.question_id,
        seen: row.seen_count,
        correct: row.correct_count,
        wrong: row.wrong_count,
        streak: row.streak,
        mastery: row.mastery,
        lastSeen: row.last_seen_at,
        nextDue: row.next_due_at,
        lastResult: row.last_result,
        lastResponseMs: row.last_response_ms,
        markedUnsure: row.marked_unsure,
      } satisfies QuestionProgress,
    ]),
  )
}

export async function loadAdminSummary() {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('admin_user_progress_summary')
    .select('*')
    .order('last_active_at', { ascending: false, nullsFirst: false })
  if (error) throw error
  return data ?? []
}
