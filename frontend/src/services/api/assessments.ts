import { request } from './client'

export interface QuizQuestion {
  id: string
  questionType: 'single' | 'multiple' | 'true_false'
  difficulty: string
  stem: string
  options: string[]
}

export const assessmentApi = {
  questions: (slug: string) => request<QuizQuestion[]>(`/challenges/${encodeURIComponent(slug)}/questions`),
  submit: (slug: string, answers: Array<{ questionId: string; answer: unknown }>) => request<{ score: number; correct: number; total: number; passed: boolean }>(
    `/challenges/${encodeURIComponent(slug)}/submit`,
    { method: 'POST', headers: { 'idempotency-key': crypto.randomUUID() }, body: JSON.stringify({ answers }) },
  ),
}
