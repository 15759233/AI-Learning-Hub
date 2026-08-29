import { describe, expect, it } from 'vitest'
import { QuizBoxMapper } from '../src/integrations/quiz-box/quiz-box.mapper'
import { CatalogService } from '../src/modules/catalog/catalog.service'

describe('平台公共契约', () => {
  it('题盒成绩映射只保留统一字段', () => {
    expect(QuizBoxMapper.attempt({ id: 'a1', userId: 'u1', paperId: 'p1', score: 88, submittedAt: '2026-08-29T00:00:00Z', answer: 'secret' })).toEqual({
      externalAttemptId: 'a1',
      userExternalId: 'u1',
      paperExternalId: 'p1',
      score: 88,
      submittedAt: '2026-08-29T00:00:00Z',
    })
  })

  it('结构化内容拒绝脚本协议', () => {
    const service = new CatalogService({} as never)
    expect(() => (service as any).sanitize({ body: '<script>alert(1)</script>' })).toThrow('内容包含不安全脚本')
    expect(() => (service as any).sanitize({ link: 'javascript:alert(1)' })).toThrow('内容包含不安全脚本')
  })

  it('安全结构化内容保持 JSON 语义', () => {
    const service = new CatalogService({} as never)
    expect((service as any).sanitize({ blocks: [{ type: 'paragraph', text: '学习 AI' }] })).toEqual({ blocks: [{ type: 'paragraph', text: '学习 AI' }] })
  })
})
