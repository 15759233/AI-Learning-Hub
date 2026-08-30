import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { CommunityFeedDto, CommunityPostDetailDto } from '@ai-learning-hub/contracts'
import { useCommunityStore } from '../stores/community'
import { communityApi } from '../services/api/community'
import { mockCommunity, resetCommunityMock } from '../services/api/community.mock'

vi.mock('../services/api/community', () => ({ communityApi: { feed: vi.fn(), context: vi.fn(), post: vi.fn(), follow: vi.fn() } }))
beforeEach(() => { setActivePinia(createPinia()); vi.resetAllMocks(); resetCommunityMock() })
const postFixture = () => mockCommunity<CommunityPostDetailDto>('/posts/community-note-1', 'GET')
const page = (posts: CommunityPostDetailDto[], cursor = 'stable-cursor'): CommunityFeedDto => ({ requestId: 'stable-session', policyVersion: 'v1', items: posts.map((post) => ({ type: 'post', id: post.id, post })), nextCursor: cursor, degraded: false })
describe('社区账号状态隔离', () => {
  it('登出清空游标、滚动位置、草稿、未读与旧请求，迟到响应不恢复状态', async () => {
    const store = useCommunityStore()
    let resolve!: (value: CommunityFeedDto) => void
    vi.mocked(communityApi.feed).mockReturnValue(new Promise((done) => { resolve = done }))
    store.unread = 8; store.openComposer({ title: '未发布的私人草稿' }); store.publishNotice = { id: 'old-post', text: '旧账号发布提示' }
    const loading = store.loadFeed('latest', 'question')
    store.feeds['latest:question'].scroll = 640
    store.clear()
    resolve({ requestId: 'old-session', policyVersion: 'v1', items: [], nextCursor: 'old-cursor', degraded: false })
    await loading
    expect(store.feeds).toEqual({}); expect(store.draft).toBeNull(); expect(store.unread).toBe(0)
    expect(store.composerOpen).toBe(false); expect(store.context).toBeNull(); expect(store.publishNotice).toBeNull(); expect(store.lastFeedLocation).toBe('/community')
  })
  it('发布返回DTO置顶去重，保留会话游标和滚动位置，其余缓存失效', async () => {
    const store = useCommunityStore(), post = await postFixture(), old = { ...post, id: 'old-post' }
    vi.mocked(communityApi.feed).mockResolvedValue(page([old, post]))
    await store.loadFeed('latest', 'all')
    await store.loadFeed('for_you', 'all')
    const current = store.feeds['for_you:all']
    current.scroll = 800; store.openComposer()
    store.published({ ...post, title: '刚刚发布的已确认内容' })
    expect(current.items.map((item) => item.id)).toEqual([post.id, old.id])
    expect(current.items[0]).toMatchObject({ post: { title: '刚刚发布的已确认内容' } })
    expect(current.cursor).toBe('stable-cursor'); expect(current.requestId).toBe('stable-session'); expect(current.scroll).toBe(800)
    expect(store.feeds['latest:all'].loaded).toBe(false); expect(store.composerOpen).toBe(false)
    expect(store.publishNotice?.text).toContain('发布成功，已插入当前列表顶部')
    expect(communityApi.feed).toHaveBeenCalledTimes(2)
    vi.mocked(communityApi.feed).mockResolvedValue(page([post, { ...post, id: 'next-post' }], 'next-cursor'))
    await store.loadFeed('for_you', 'all')
    expect(communityApi.feed).toHaveBeenLastCalledWith('for_you', 'all', 'stable-cursor')
    expect(current.items.map((item) => item.id)).toEqual([post.id, old.id, 'next-post'])
  })
  it('当前类型及关注语义不匹配时不硬插，匹配的最新和关注流可置顶', async () => {
    const store = useCommunityStore(), post = await postFixture()
    expect(post.topics.length).toBeGreaterThan(0)
    for (const [mode, type, followsTopic, inserted] of [['for_you', 'question', false, false], ['following', 'note', false, false], ['following', 'note', true, true], ['latest', 'note', false, true]] as const) {
      store.clear()
      vi.mocked(communityApi.feed).mockResolvedValue(page([]))
      await store.loadFeed(mode, type)
      store.published({ ...post, viewerState: { ...post.viewerState, followingAuthor: false }, topics: post.topics.map((topic) => ({ ...topic, following: followsTopic })) })
      expect(store.feeds[`${mode}:${type}`].items.some((item) => item.id === post.id)).toBe(inserted)
      expect(store.publishNotice?.text).toContain(inserted ? '插入当前列表顶部' : '当前筛选未展示')
    }
  })
  it('发布期间的刷新响应不会覆盖新帖，其他模式迟到响应不能恢复失效缓存', async () => {
    const store = useCommunityStore(), post = await postFixture()
    vi.mocked(communityApi.feed).mockResolvedValue(page([]))
    await store.loadFeed('for_you', 'all')
    let resolveOther!: (value: CommunityFeedDto) => void, resolveCurrent!: (value: CommunityFeedDto) => void
    vi.mocked(communityApi.feed).mockReturnValueOnce(new Promise((done) => { resolveOther = done }))
    const other = store.loadFeed('latest', 'all', true)
    vi.mocked(communityApi.feed).mockReturnValueOnce(new Promise((done) => { resolveCurrent = done }))
    const current = store.loadFeed('for_you', 'all', true)
    store.published(post)
    resolveOther(page([])); resolveCurrent(page([{ ...post, id: 'ranked-post' }]))
    await Promise.all([other, current])
    expect(store.feeds['latest:all'].loaded).toBe(false)
    expect(store.feeds['for_you:all'].items.map((item) => item.id)).toEqual([post.id, 'ranked-post'])
  })
  it('取消用户或话题关注仅使关注缓存失效，不触发自动刷新或重置其他模式', async () => {
    const store = useCommunityStore(), post = await postFixture()
    vi.mocked(communityApi.feed).mockResolvedValue(page([post]))
    vi.mocked(communityApi.follow).mockResolvedValue({})
    await store.loadFeed('for_you', 'all'); await store.loadFeed('latest', 'all'); await store.loadFeed('following', 'all')
    const recommended = store.feeds['for_you:all'], latest = store.feeds['latest:all']
    for (const [id, topic] of [[post.author.id, false], [post.topics[0].id, true]] as const) {
      store.feeds['following:all'].loaded = true
      await store.follow(id, topic, false)
      expect(communityApi.follow).toHaveBeenLastCalledWith(id, topic, false)
      expect(store.feeds['following:all'].loaded).toBe(false)
      expect(store.feeds['for_you:all']).toBe(recommended); expect(store.feeds['latest:all']).toBe(latest)
      expect(recommended.loaded).toBe(true); expect(latest.loaded).toBe(true)
    }
    expect(communityApi.feed).toHaveBeenCalledTimes(3)
    vi.mocked(communityApi.feed).mockResolvedValue(page([]))
    await store.loadFeed('following', 'all', true)
    expect(store.feeds['following:all'].items).toEqual([])
  })
  it('隐藏或删除替换缓存实例，进行中的旧流响应不能把已移除帖子重新加入', async () => {
    const store = useCommunityStore(), post = await postFixture()
    vi.mocked(communityApi.feed).mockResolvedValue(page([post]))
    await store.loadFeed('for_you', 'all')
    let resolve!: (value: CommunityFeedDto) => void
    vi.mocked(communityApi.feed).mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const loading = store.loadFeed('for_you', 'all', true)
    store.removePost(post.id)
    resolve(page([post])); await loading
    expect(store.feeds['for_you:all'].items).toEqual([])
    expect(store.feeds['for_you:all'].loaded).toBe(false)
  })
})
