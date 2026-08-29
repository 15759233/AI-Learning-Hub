export interface QuizBoxAttempt {
  externalAttemptId: string
  userExternalId: string
  paperExternalId: string
  score: number
  submittedAt: string
}

export interface QuizBoxPort {
  health(): Promise<{ connected: boolean; provider: string }>
  getAttempt(externalAttemptId: string): Promise<QuizBoxAttempt>
}
