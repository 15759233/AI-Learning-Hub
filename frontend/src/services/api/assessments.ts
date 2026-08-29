import { request } from './client'
import type { StudentUser } from './auth'

export interface QuizQuestion {
  id: string
  questionType: 'single' | 'multiple' | 'true_false' | 'short_answer' | 'code'
  difficulty: string
  stem: string
  options: string[]
}

export interface ChallengeRankingEntry {
  rank: number
  userId: string
  displayName: string
  score: number
}

export const assessmentApi = {
  questions: (slug: string) => request<QuizQuestion[]>(`/challenges/${encodeURIComponent(slug)}/questions`),
  submit: (slug: string, answers: Array<{ questionId: string; answer: unknown }>) => request<{ score: number; correct: number; total: number; passed: boolean }>(
    `/challenges/${encodeURIComponent(slug)}/submit`,
    { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ answers }) },
  ),
  ranking: (slug: string) => request<ChallengeRankingEntry[]>(
    `/challenges/${encodeURIComponent(slug)}/ranking`,
  ),
}

export const loadAssessmentRanking = async (user: StudentUser | null, slug: string) => {
  if (!user) return { state: 'login-required' as const, items: [] as ChallengeRankingEntry[] }
  try {
    return { state: 'ready' as const, items: await assessmentApi.ranking(slug) }
  } catch (error) {
    return {
      state: 'error' as const,
      items: [] as ChallengeRankingEntry[],
      message: error instanceof Error ? error.message : '排行榜加载失败',
    }
  }
}
