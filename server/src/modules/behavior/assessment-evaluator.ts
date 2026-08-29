import { QuestionType } from '@prisma/client'

const key = (value: unknown) => String(value ?? '').trim()
const bool = (value: unknown) => value === true || String(value).toLowerCase() === 'true'
const set = (value: unknown) => new Set((Array.isArray(value) ? value : [value]).map(key).filter(Boolean))

export function evaluateAnswer(type: QuestionType, answer: unknown, standard: unknown) {
  if (type === QuestionType.single) return key(answer) === key(standard)
  if (type === QuestionType.multiple) {
    const actual = set(answer)
    const expected = set(standard)
    return actual.size === expected.size && [...expected].every((item) => actual.has(item))
  }
  if (type === QuestionType.true_false) return bool(answer) === bool(standard)
  if (type === QuestionType.short_answer) {
    const config = standard && typeof standard === 'object' && !Array.isArray(standard)
      ? standard as { keywords?: unknown[]; mode?: string }
      : {}
    const keywords = (config.keywords || []).map(key).filter(Boolean)
    const text = key(answer).toLowerCase()
    if (!keywords.length) return false
    return config.mode === 'any'
      ? keywords.some((word) => text.includes(word.toLowerCase()))
      : keywords.every((word) => text.includes(word.toLowerCase()))
  }
  if (type === QuestionType.code) {
    const expected = standard && typeof standard === 'object' && !Array.isArray(standard)
      ? (standard as { expectedOutputs?: unknown[] }).expectedOutputs
      : undefined
    const outputs = answer && typeof answer === 'object' && !Array.isArray(answer)
      ? (answer as { outputs?: unknown[] }).outputs
      : undefined
    return !!expected && !!outputs && expected.length === outputs.length
      && expected.every((value, index) => key(value) === key(outputs[index]))
  }
  return false
}
