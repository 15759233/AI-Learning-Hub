import type { CommunityModerationInput } from '@ai-learning-hub/contracts'

export function communityModerationPayload(input: CommunityModerationInput): CommunityModerationInput {
  const { action, reason } = input, label = input.label?.trim()
  if (action === 'label' && !label) throw new Error('请填写有效的说明标签')
  return { action, reason, ...(action === 'label' ? { label } : {}) }
}
