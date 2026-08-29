import { describe, expect, it, vi } from 'vitest'
import { assessmentApi, loadAssessmentRanking } from './assessments'

describe('匿名测评页初始化', () => {
  it('没有学生会话时返回明确登录边界且不请求受保护排行榜', async () => {
    const ranking = vi.spyOn(assessmentApi, 'ranking')
    const result = await loadAssessmentRanking(null, 'weekly-ai')

    expect(result).toEqual({ state: 'login-required', items: [] })
    expect(ranking).not.toHaveBeenCalled()
  })
})
