import { beforeEach, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type { ChallengeDetailDto } from '@ai-learning-hub/contracts'
import AssessmentsView from '../views/AssessmentsView.vue'
import { loadAssessmentRanking, type ChallengeRankingEntry } from '../services/api/assessments'
import { request } from '../services/api/client'
import { quizBridge } from '../services/quizBridge'
import { flushRender, setupComponent } from './test-renderer'

const routing = vi.hoisted(() => ({ route: {} as { query: { challenge?: unknown } }, record: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => routing.route }))
vi.mock('../services/api/client', () => ({ dataMode: 'api', request: vi.fn() }))
vi.mock('../services/api/assessments', () => ({ loadAssessmentRanking: vi.fn() }))
vi.mock('../services/quizBridge', () => ({ quizBridge: { startChallenge: vi.fn() } }))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ user: { id: 'viewer' } }) }))
vi.mock('../stores/learning', () => ({ useLearningStore: () => ({ recordAssessment: routing.record }) }))
const item = (slug: string) => ({ id: slug, slug, title: slug, summary: slug, data: {}, targetScore: 80, rewardPoints: 10 }) as ChallengeDetailDto
interface State { challenge: ChallengeDetailDto | undefined | null; challengeRules: string; ranking: ChallengeRankingEntry[]; selectionError: string; startChallenge: () => void }
beforeEach(() => {
  vi.resetAllMocks()
  routing.route = reactive({ query: {} })
  vi.mocked(request).mockImplementation(async (path) => path.startsWith('/challenges?') ? { items: [item('weekly-ai')], page: 1, pageSize: 12, total: 20 } : item(decodeURIComponent(path.split('/').at(-1)!)))
  vi.mocked(loadAssessmentRanking).mockResolvedValue({ state: 'ready', items: [] })
})
it('社区链接加载列表当前页外的指定挑战，标题、排行榜与参加动作使用同一标识', async () => {
  routing.route.query.challenge = 'security-sprint'
  const view = setupComponent<State>(AssessmentsView)
  await flushRender()
  expect(request).toHaveBeenCalledWith('/challenges/security-sprint')
  expect(view.state.challenge?.slug).toBe('security-sprint')
  expect(loadAssessmentRanking).toHaveBeenLastCalledWith({ id: 'viewer' }, 'security-sprint')
  view.state.startChallenge()
  expect(quizBridge.startChallenge).toHaveBeenCalledWith('security-sprint')
  expect(routing.record).toHaveBeenCalledWith('challenge', 'security-sprint')
  routing.route.query = {}; await flushRender()
  expect(view.state.challenge?.slug).toBe('weekly-ai')
  view.unmount()
})
it('无效或不可用挑战不回退成其他挑战，也不能启动错误挑战', async () => {
  routing.route.query.challenge = ['weekly-ai', 'security-sprint']
  const view = setupComponent<State>(AssessmentsView)
  await flushRender()
  expect(view.state.selectionError).toContain('标识无效')
  expect(view.state.challenge).toBeNull()
  view.state.startChallenge(); expect(quizBridge.startChallenge).not.toHaveBeenCalled()
  vi.mocked(request).mockRejectedValueOnce(new Error('404'))
  routing.route.query.challenge = 'missing'; await flushRender()
  expect(view.state.selectionError).toContain('暂不可用')
  expect(view.state.challenge).toBeNull()
  view.unmount()
})
it('快速切换挑战时旧排行榜迟到不能覆盖当前挑战', async () => {
  let resolveOld!: (value: { state: 'ready'; items: ChallengeRankingEntry[] }) => void
  vi.mocked(loadAssessmentRanking).mockReturnValueOnce(new Promise((done) => { resolveOld = done })).mockResolvedValue({ state: 'ready', items: [{ userId: 'new', displayName: '新榜单', rank: 1, score: 90 }] })
  routing.route.query.challenge = 'weekly-ai'
  const view = setupComponent<State>(AssessmentsView)
  await flushRender()
  routing.route.query.challenge = 'security-sprint'; await flushRender()
  resolveOld({ state: 'ready', items: [{ userId: 'old', displayName: '旧榜单', rank: 1, score: 80 }] }); await flushRender()
  expect(view.state.challenge?.slug).toBe('security-sprint')
  expect(view.state.ranking.map((row) => row.userId)).toEqual(['new'])
  view.unmount()
})
it('规则展示排除六类封面元数据，完整保留业务字段且不修改挑战数据', async () => {
  const business: ChallengeDetailDto['data'] = { questions: 30, durationMinutes: 20, participants: 0, difficulty: 'Transformer 与 Function Calling 规则说明。'.repeat(80), integration: 'web-native', leaderboardEnabled: false, endAt: '2026-12-31' }
  const media: ChallengeDetailDto['data'] = { coverAssetId: 'media-preview', cover: '/api/v1/public/media/media-preview', coverAlt: '媒体替代文本', coverFocalPoint: { x: .5, y: .5 }, coverSource: 'explicit', coverFallback: { id: 'fallback', url: '/api/v1/public/media/fallback', alt: '默认媒体', width: 1200, height: 675, focalPoint: { x: .5, y: .5 }, source: 'global_default' } }
  const data = { ...business, ...media }, before = JSON.stringify(data)
  vi.mocked(request).mockResolvedValue({ items: [{ ...item('weekly-ai'), data }], page: 1, pageSize: 12, total: 1 })
  const view = setupComponent<State>(AssessmentsView)
  try {
    expect(view.state.challengeRules).toBe('{}')
    await flushRender()
    expect(JSON.parse(view.state.challengeRules)).toEqual(business)
    for (const key of Object.keys(media)) expect(view.state.challengeRules).not.toContain(`"${key}"`)
    expect(view.state.challengeRules).not.toContain('/api/v1/public/media/')
    expect(JSON.stringify(view.state.challenge?.data)).toBe(before)
  } finally { view.unmount() }
})
