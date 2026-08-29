import type { QuizBoxAttempt } from './quiz-box.interface'

export class QuizBoxMapper {
  static attempt(input: unknown): QuizBoxAttempt {
    const value = input as Record<string, unknown>
    return {
      externalAttemptId: String(value.id || ''),
      userExternalId: String(value.userId || ''),
      paperExternalId: String(value.paperId || ''),
      score: Number(value.score || 0),
      submittedAt: String(value.submittedAt || ''),
    }
  }
}
