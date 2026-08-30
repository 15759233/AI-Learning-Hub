import { beforeEach, describe, expect, it, vi } from 'vitest'
import { reactive } from 'vue'
import type { CommunityProfileDto, CommunityTopicDto } from '@ai-learning-hub/contracts'
import CommunityCollectionView from './CommunityCollectionView.vue'
import { communityApi } from '../services/api/community'
import { mockCommunity, resetCommunityMock } from '../services/api/community.mock'
import { flushRender, setupComponent } from './test-renderer'

interface CollectionState { profile: CommunityProfileDto | null; topic: CommunityTopicDto | null; tab: string; follow: () => Promise<void> }

const routing = vi.hoisted(() => ({ route: {} as Record<string, unknown> }))
vi.mock('vue-router', () => ({ useRoute: () => routing.route }))
vi.mock('../stores/auth', () => ({ useAuthStore: () => ({ user: { id: 'viewer' }, dataMode: 'api' }) }))
vi.mock('../stores/learning', () => ({ useLearningStore: () => ({ notes: {}, favorites: [] }) }))
vi.mock('./CommunityPostCard.vue', () => ({ default: { render: () => null } }))
vi.mock('../services/api/community', () => ({ communityApi: { profile: vi.fn(), topics: vi.fn(), list: vi.fn(), following: vi.fn(), follow: vi.fn(), signals: vi.fn() } }))
const navigate = (view: string, id: string) => Object.assign(routing.route, { path: `/community/${view}/${id}`, fullPath: `/community/${view}/${id}`, meta: { communityView: view }, params: view === 'topic' ? { slug: id } : { username: id }, query: {} })
beforeEach(async () => {
  vi.resetAllMocks(); resetCommunityMock(); routing.route = reactive({})
  vi.mocked(communityApi.list).mockResolvedValue([])
  vi.mocked(communityApi.following).mockResolvedValue([])
  vi.mocked(communityApi.follow).mockResolvedValue({})
  vi.mocked(communityApi.signals).mockResolvedValue({})
  vi.mocked(communityApi.topics).mockResolvedValue(await mockCommunity('/topics', 'GET'))
})
describe('复用社区集合页的路由隔离', () => {
  it('话题到作者清除异类状态，关注仅操作当前作者，返回话题重置子Tab', async () => {
    const profile = { ...await mockCommunity<CommunityProfileDto>('/users/student', 'GET'), id: 'new-author', displayName: '当前作者', following: false }
    vi.mocked(communityApi.profile).mockResolvedValue(profile)
    navigate('topic', 'linux')
    const view = setupComponent<CollectionState>(CommunityCollectionView)
    await flushRender()
    const description = (await communityApi.topics()).find((topic) => topic.slug === 'linux')!.description
    expect(view.state.topic?.description).toBe(description)
    navigate('user', 'new-author'); await flushRender()
    expect(view.state.profile?.displayName).toBe('当前作者')
    expect(view.state.topic).toBeNull()
    await view.state.follow()
    expect(communityApi.follow).toHaveBeenLastCalledWith('new-author', false, true)
    view.state.tab = 'following'; await flushRender()
    navigate('topic', 'linux'); await flushRender()
    expect(view.state.topic?.description).toBe(description)
    expect(view.state.tab).toBe('posts')
    expect(view.state.profile).toBeNull()
    view.unmount()
  })
  it('快速换作者后，旧请求的迟到响应不能覆盖当前页或触发旧访问记录', async () => {
    const profile = await mockCommunity<CommunityProfileDto>('/users/student', 'GET')
    let resolveOld!: (value: CommunityProfileDto) => void
    vi.mocked(communityApi.profile).mockReturnValueOnce(new Promise((done) => { resolveOld = done })).mockResolvedValue({ ...profile, id: 'new', displayName: '新作者' })
    navigate('user', 'old')
    const view = setupComponent<CollectionState>(CommunityCollectionView)
    await flushRender()
    navigate('user', 'new'); await flushRender()
    resolveOld({ ...profile, id: 'old', displayName: '旧作者' }); await flushRender()
    expect(view.state.profile?.displayName).toBe('新作者'); expect(view.state.topic).toBeNull()
    expect(communityApi.list).not.toHaveBeenCalledWith('user', 'old')
    expect(communityApi.signals).not.toHaveBeenCalledWith(expect.objectContaining({ targetId: 'old' }))
    view.unmount()
  })
})
