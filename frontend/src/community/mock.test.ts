import { beforeEach, describe, expect, it } from 'vitest'
import { mockCommunity, resetCommunityMock } from '../services/api/community.mock'
import type { CommunityCommentDto, CommunityFeedDto, CommunityPostDetailDto, CommunityPostInput, CommunityNotificationDto } from '@ai-learning-hub/contracts'

beforeEach(resetCommunityMock)
describe('显式社区 Mock 与统一 Fixtures', () => {
  it('固定规模、初始互动与通知使用同一语义，重置清除状态', async () => {
    const posts = await mockCommunity<CommunityPostDetailDto[]>('/posts', 'GET')
    expect(posts).toHaveLength(90)
    expect(posts[0].viewerState.bookmarked).toBe(true)
    expect(await mockCommunity<CommunityNotificationDto[]>('/notifications', 'GET')).toHaveLength(1)
    await mockCommunity(`/posts/${posts[0].id}/hide`, 'POST')
    await expect(mockCommunity(`/posts/${posts[0].id}`, 'GET')).rejects.toThrow('不可见')
    resetCommunityMock()
    expect(await mockCommunity<CommunityPostDetailDto[]>('/posts', 'GET')).toHaveLength(90)
  })
  it('分页快照不重复并绑定筛选，话题关注即时生效', async () => {
    const first = await mockCommunity<CommunityFeedDto>('/feed?mode=latest&type=all', 'GET')
    const second = await mockCommunity<CommunityFeedDto>(`/feed?mode=latest&type=all&cursor=${first.nextCursor}`, 'GET')
    expect(new Set([...first.items, ...second.items].map((p) => p.id)).size).toBe(40)
    await expect(mockCommunity(`/feed?mode=latest&type=question&cursor=${first.nextCursor}`, 'GET')).rejects.toThrow('不匹配')
    await mockCommunity('/topics/community-topic-rag/follow', 'PUT')
    const following = await mockCommunity<CommunityFeedDto>('/feed?mode=following&type=all', 'GET')
    expect(following.items.some((p) => p.type === 'post' && p.post.topics.some((t) => t.slug === 'rag'))).toBe(true)
  })
  it('草稿仅本人主页可见，禁止编辑他人内容', async () => {
    const input: CommunityPostInput = { type: 'note', title: '尚未公开的学习笔记', contentBlocks: [{ type: 'paragraph', text: '先验证内容，再主动发布到社区。' }], bindings: [], topicIds: [], visibility: 'public', status: 'draft' }
    const draft = await mockCommunity<CommunityPostDetailDto>('/posts', 'POST', input)
    expect(draft.question).toBeNull()
    expect(draft.viewerState.bookmarked).toBe(false)
    expect((await mockCommunity<CommunityPostDetailDto[]>('/posts', 'GET')).some((p) => p.id === draft.id)).toBe(false)
    expect((await mockCommunity<CommunityPostDetailDto[]>('/users/student/posts', 'GET')).some((p) => p.id === draft.id)).toBe(true)
    await expect(mockCommunity('/posts/community-question-2', 'PATCH', input)).rejects.toThrow('自己的')
  })
  it('父A、父B、回A分组稳定，删除父项不打散回复', async () => {
    const post = await mockCommunity<CommunityPostDetailDto>('/posts', 'POST', { type: 'note', contentBlocks: [{ type: 'paragraph', text: '验证两级评论的实际归属。' }], bindings: [], topicIds: [], visibility: 'public', status: 'published' })
    const path = `/posts/${post.id}/comments`
    const add = (text: string, parentId?: string) => mockCommunity<CommunityCommentDto>(path, 'POST', { contentBlocks: [{ type: 'paragraph', text }], parentId })
    const root = await add('父评论A'), second = await add('父评论B'), reply = await add('回复父评论A', root.id)
    const ids = async () => (await mockCommunity<CommunityCommentDto[]>(path, 'GET')).map((row) => row.id)
    expect(await ids()).toEqual([root.id, reply.id, second.id])
    await mockCommunity(`/comments/${root.id}`, 'DELETE')
    expect(await ids()).toEqual([root.id, reply.id, second.id])
  })
})
