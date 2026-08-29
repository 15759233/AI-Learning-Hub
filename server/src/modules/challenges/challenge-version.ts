import type { Prisma } from '@prisma/client'

export interface ChallengeSnapshot {
  title?: string
  summary?: string
  challengeType?: string
  targetScore?: number
  rewardPoints?: number
  questionBankId?: string | null
  paperId?: string | null
  data: Record<string, unknown>
  rules: Array<{ ruleKey: string; config: Prisma.JsonValue }>
}

export const readChallengeSnapshot = (snapshot: Prisma.JsonValue | null | undefined): ChallengeSnapshot => {
  const value = snapshot && typeof snapshot === 'object' && !Array.isArray(snapshot)
    ? snapshot as Record<string, unknown>
    : {}
  return {
    title: typeof value.title === 'string' ? value.title : undefined,
    summary: typeof value.summary === 'string' ? value.summary : undefined,
    challengeType: typeof value.challengeType === 'string' ? value.challengeType : undefined,
    targetScore: typeof value.targetScore === 'number' ? value.targetScore : undefined,
    rewardPoints: typeof value.rewardPoints === 'number' ? value.rewardPoints : undefined,
    questionBankId: typeof value.questionBankId === 'string' ? value.questionBankId : null,
    paperId: typeof value.paperId === 'string' ? value.paperId : null,
    data: value.data && typeof value.data === 'object' && !Array.isArray(value.data) ? value.data as Record<string, unknown> : {},
    rules: Array.isArray(value.rules) ? value.rules.filter((rule): rule is { ruleKey: string; config: Prisma.JsonValue } => (
      Boolean(rule) && typeof rule === 'object' && !Array.isArray(rule) && typeof (rule as Record<string, unknown>).ruleKey === 'string'
    )) : [],
  }
}
