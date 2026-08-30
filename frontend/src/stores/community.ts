import { defineStore } from 'pinia'
import type { CommunityContextDto, CommunityFeedMode, CommunityPostDetailDto, CommunityPostInput, CommunityPostType, FeedUnitDto } from '@ai-learning-hub/contracts'
import { communityApi } from '../services/api/community'
interface FeedState { items: FeedUnitDto[]; publishedPosts: FeedUnitDto[]; cursor: string | null; loaded: boolean; scroll: number; requestId: string }
export const useCommunityStore = defineStore('community', {
  state: () => ({ feeds: {} as Record<string, FeedState>, context: null as CommunityContextDto | null, unread: 0, composerOpen: false, composerMode: 'quick' as 'quick' | 'advanced', composerInline: false, draft: null as CommunityPostInput | null, editingId: undefined as string | undefined, publishNotice: null as { id: string; text: string } | null, error: '', epoch: 0, lastFeedLocation: '/community' }),
  actions: {
    clear() { const epoch = this.epoch + 1; this.$reset(); this.epoch = epoch },
    openComposer(input?: Partial<CommunityPostInput>, id?: string) {
      if (this.composerOpen) {
        window.dispatchEvent(new CustomEvent('community-composer-focus'))
        if (input || id) window.dispatchEvent(new CustomEvent('api-error', { detail: { message: '请先保存或关闭当前编辑，再打开其他内容；当前草稿未被覆盖。' } }))
        return
      }
      this.draft = { type: 'general', title: '', contentBlocks: [], bindings: [], topicIds: [], visibility: 'public', status: 'published', ...input }
      this.composerMode = id ? 'advanced' : 'quick'
      this.composerInline = typeof location !== 'undefined' && location.pathname === '/community' && typeof matchMedia !== 'undefined' && !matchMedia('(max-width: 767px)').matches && !id
      this.editingId = id; this.publishNotice = null; this.composerOpen = true
    },
    async loadContext() { const epoch = this.epoch; const context = await communityApi.context(); if (epoch === this.epoch) this.context = context },
    async loadFeed(mode: CommunityFeedMode, type: CommunityPostType | 'all', reset = false) {
      const key = `${mode}:${type}`, epoch = this.epoch
      this.lastFeedLocation = `/community?${new URLSearchParams({ mode, type })}`
      this.feeds[key] ||= { items: [], publishedPosts: [], cursor: null, loaded: false, scroll: 0, requestId: '' }
      const entry = this.feeds[key]
      if (reset) entry.publishedPosts = []
      const result = await communityApi.feed(mode, type, reset ? undefined : entry.cursor || undefined)
      if (epoch !== this.epoch || this.feeds[key] !== entry) return
      const retained = reset ? entry.publishedPosts : entry.items
      const ids = new Set(retained.map((item) => item.id))
      entry.items = [...retained, ...result.items.filter((item) => !ids.has(item.id))]
      entry.cursor = result.nextCursor; entry.requestId = result.requestId; entry.loaded = true
      this.error = result.degraded ? '推荐暂不可用，当前按可见内容发布时间展示。' : ''
    },
    async refreshPost(id: string) {
      const epoch = this.epoch
      const post = await communityApi.post(id)
      if (epoch !== this.epoch) return post
      for (const feed of Object.values(this.feeds)) for (const item of feed.items) if (item.type === 'post' && item.id === id) item.post = post
      return post
    },
    invalidateFollowing() {
      for (const [key, feed] of Object.entries(this.feeds)) if (key.startsWith('following:')) this.feeds[key] = { ...feed, loaded: false, publishedPosts: [] }
    },
    async follow(id: string, topic: boolean, active: boolean) {
      const epoch = this.epoch
      await communityApi.follow(id, topic, active)
      if (epoch !== this.epoch) return
      this.invalidateFollowing()
      for (const feed of Object.values(this.feeds)) for (const item of feed.items) if (item.type === 'post') {
        if (!topic && item.post.author.id === id) item.post.viewerState.followingAuthor = active
        if (topic) item.post.topics.forEach((row) => { if (row.id === id) row.following = active })
      }
    },
    removePost(id: string) {
      for (const [key, feed] of Object.entries(this.feeds)) this.feeds[key] = { ...feed, loaded: false, items: feed.items.filter((item) => item.id !== id), publishedPosts: (feed.publishedPosts || []).filter((item) => item.id !== id) }
    },
    published(post: CommunityPostDetailDto) {
      const query = new URLSearchParams(this.lastFeedLocation.split('?')[1]), mode = query.get('mode') || 'for_you', type = query.get('type') || 'all'
      const key = `${mode}:${type}`, entry = this.feeds[key]
      const matches = post.status === 'published' && (type === 'all' || type === post.type) && (mode !== 'following' || post.viewerState.followingAuthor || post.topics.some((topic) => topic.following))
      for (const [otherKey, feed] of Object.entries(this.feeds)) if (otherKey !== key) this.feeds[otherKey] = { ...feed, loaded: false, items: feed.items.filter((item) => item.id !== post.id), publishedPosts: [] }
      if (entry) {
        entry.items = entry.items.filter((item) => item.id !== post.id)
        entry.publishedPosts = (entry.publishedPosts || []).filter((item) => item.id !== post.id)
      }
      if (entry && matches) {
        const item: FeedUnitDto = { type: 'post', id: post.id, post }
        entry.publishedPosts = [item, ...entry.publishedPosts]
        entry.items = [item, ...entry.items]
      }
      this.publishNotice = { id: post.id, text: `${this.editingId ? '更新' : '发布'}成功${entry ? matches ? '，已插入当前列表顶部' : '，当前筛选未展示此内容' : '，可查看动态'}` }
      this.composerOpen = false
      return post.id
    },
  },
})
