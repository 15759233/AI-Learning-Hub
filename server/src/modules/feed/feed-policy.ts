import type { CommunityFeedPolicyDto } from '@ai-learning-hub/contracts'
export const learningFeedPolicy: CommunityFeedPolicyDto = {
  version: 'learning-v1',
  candidateLimits: { following: 35, learning_context: 40, topic_affinity: 35, same_school: 30, quality: 40, unanswered: 30, official: 20, exploration: 40 },
  weights: { learning: 0.28, quality: 0.18, relationship: 0.14, useful: 0.12, freshness: 0.10, social: 0.08, learningAction: 0.06, exploration: 0.04 },
  penalties: { seen: 0.12, limited: 0.4, report: 0.3, short: 0.2, links: 0.15, duplicateBinding: 0.05 },
  diversity: { maxSameAuthorInWindow: 2, authorWindowSize: 10, maxSameTypeConsecutive: 3, maxOfficialInWindow: 1 },
  insertions: { continueLearningRange: [4, 6], challengeRange: [9, 12], topicSuggestionRange: [14, 18] },
}
export const freshnessHours: Record<string, number> = { question: 48, frontier_discussion: 72, note: 168, lab_result: 240, project: 336, achievement: 168, general: 72 }
