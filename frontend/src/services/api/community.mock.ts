import { createCommunityFixtures, demoArticles, demoChallenges, demoCourses, demoLabs, demoResources, demoStudents, demoThemes } from '@ai-learning-hub/demo-fixtures'
import type { CommunityAuthorDto, CommunityCommentDto, CommunityContentBlock, CommunityContextDto, CommunityNotificationDto, CommunityPostDetailDto, CommunityPostInput, CommunityProfileDto, CommunityTopicDto } from '@ai-learning-hub/contracts'
const fixtures = createCommunityFixtures({ courses: demoCourses, labs: demoLabs, articles: demoArticles, themes: demoThemes, students: demoStudents })
const authors: CommunityAuthorDto[] = fixtures.users.map((user) => ({ id: user.username, username: user.username, displayName: user.displayName, verifiedType: user.verifiedType, avatar: null, major: user.major, school: 'AI 创客学院' }))
const initialPosts: CommunityPostDetailDto[] = fixtures.posts.map((post) => ({
  id: post.id, type: post.type, status: 'published', visibility: post.visibility, title: post.title, body: post.blocks.map((b) => b.type === 'code' ? b.code : b.type === 'image' ? b.alt : b.text).join('\n'), bodyPreview: '', contentBlocks: post.blocks, author: authors.find((user) => user.id === post.author)!,
  bindings: post.bindings.filter((b) => b.type !== 'lab_run').map((binding) => { const content = (binding.type === 'course' ? demoCourses : binding.type === 'lab' ? demoLabs : demoArticles).find((row) => row.slug === binding.id)!; return { type: binding.type, id: binding.id, slug: binding.id, title: content.title, summary: content.summary, route: binding.type === 'course' ? `/courses/${binding.id}` : binding.type === 'lab' ? `/labs/${binding.id}` : `/frontier?article=${binding.id}`, status: 'published' } }),
  topics: [], stats: { likes: fixtures.reactions.filter((r) => r.postId === post.id && r.type === 'like').length, useful: fixtures.reactions.filter((r) => r.postId === post.id && r.type === 'useful').length, comments: 2, bookmarks: fixtures.bookmarks.filter((r) => r.postId === post.id).length },
  viewerState: { liked: fixtures.reactions.some((r) => r.postId === post.id && r.username === authors[0].id && r.type === 'like'), markedUseful: fixtures.reactions.some((r) => r.postId === post.id && r.username === authors[0].id && r.type === 'useful'), bookmarked: fixtures.bookmarks.some((r) => r.postId === post.id && r.username === authors[0].id), followingAuthor: fixtures.follows.some((f) => f.follower === authors[0].id && f.followee === post.author) }, recommendationReasons: ['显式演示数据 · 与 Seed 共用语义'], labels: [], question: post.type === 'question' ? { status: 'open', acceptedCommentId: null, teacherAnswered: false } : null, publishedAt: post.publishedAt, editedAt: null,
}))
const topics: CommunityTopicDto[] = fixtures.topics.map((t) => ({ ...t, themeId: t.theme, status: 'active', following: false, postCount: fixtures.posts.filter((p) => p.topics.includes(t.id)).length, followerCount: 0 }))
for (const post of initialPosts) { post.topics = topics.filter((topic) => fixtures.posts.find((p) => p.id === post.id)!.topics.includes(topic.id)); post.bodyPreview = post.body.slice(0, 320) }
const initialComments: CommunityCommentDto[] = fixtures.comments.map((c) => ({ id: c.id, postId: c.postId, author: authors.find((u) => u.id === c.author)!, parentId: c.parentId, rootId: c.parentId, body: c.body, contentBlocks: [{ type: 'paragraph', text: c.body }], deleted: false, likes: 0, liked: false, accepted: false, createdAt: new Date().toISOString() }))
const initialNotifications: CommunityNotificationDto[] = fixtures.notifications.filter((n) => n.recipient === authors[0].id).map((n) => ({ id: n.id, type: n.type, actor: authors.find((a) => a.id === n.actor)!, entityType: n.entityType, entityId: n.entityId, text: n.text, count: 1, readAt: null, createdAt: n.createdAt, source: 'community' }))
let comments = structuredClone(initialComments), notifications = structuredClone(initialNotifications)
let posts = structuredClone(initialPosts)
const initialFollowing = fixtures.follows.filter((f) => f.follower === authors[0].id).map((f) => f.followee)
const hidden = new Set<string>(), muted = new Set<string>(), following = new Set(initialFollowing)
const cursors = new Map<string, { ids: string[]; offset: number; mode: string; type: string; requestId: string }>()
let bio = '', headline = '', allowAchievementDrafts = false
export const resetCommunityMock = () => {
  posts = structuredClone(initialPosts); comments = structuredClone(initialComments); notifications = structuredClone(initialNotifications)
  hidden.clear(); muted.clear(); following.clear(); cursors.clear(); initialFollowing.forEach((id) => following.add(id))
  topics.forEach((topic) => { topic.following = false; topic.followerCount = 0 })
  bio = ''; headline = ''; allowAchievementDrafts = false
}
const text = (blocks: CommunityContentBlock[]) => blocks.map((block) => block.type === 'image' ? block.alt : block.type === 'code' ? block.code : block.text).join('\n')
const context = (): CommunityContextDto => ({ todayPlan: null, continueCourse: null, continueLab: null, currentChallenge: null, trendingTopics: topics.slice(0, 6), suggestedUsers: authors.filter((user) => user.verifiedType !== 'none'), needsInterests: topics.filter((t) => t.following).length < 3 })
const visible = (ownDrafts = false) => posts.filter((p) => !hidden.has(p.id) && !muted.has(p.author.id) && (p.status === 'published' || p.status === 'limited' || (ownDrafts && p.status === 'draft' && p.author.id === authors[0].id)))
const requirePost = (id: string) => { const post = visible(true).find((p) => p.id === id); if (!post) throw new Error('动态不可见或已删除'); return post }
const requireOwner = (authorId: string) => { if (authorId !== authors[0].id) throw new Error('只能修改自己的内容') }
const filtered = (url: URL) => visible().filter((p) => (!url.searchParams.get('type') || url.searchParams.get('type') === 'all' || p.type === url.searchParams.get('type')) && (url.searchParams.get('mode') !== 'following' || following.has(p.author.id) || p.topics.some((t) => topics.find((topic) => topic.id === t.id)?.following)))
export async function mockCommunity<T>(path: string, method: string, body?: unknown): Promise<T> {
  const url = new URL(path, 'http://mock.invalid'), parts = url.pathname.split('/').filter(Boolean)
  const [root, id, action, fourth] = parts
  let value: unknown
  if (root === 'feed') {
    if (id === 'updates') value = { count: filtered(url).filter((p) => p.publishedAt > (url.searchParams.get('since') || '')).length }
    else if (method !== 'GET') value = { received: true }
    else {
      const cursor = url.searchParams.get('cursor'), type = url.searchParams.get('type') || 'all', mode = url.searchParams.get('mode') || 'for_you'
      const session = cursor ? cursors.get(cursor) : { ids: filtered(url).sort((a, b) => b.publishedAt.localeCompare(a.publishedAt) || b.id.localeCompare(a.id)).map((p) => p.id), offset: 0, type, mode, requestId: crypto.randomUUID() }
      if (!session || session.type !== type || session.mode !== mode) throw new Error('游标已失效或筛选不匹配，请刷新')
      const list = visible().filter((p) => session.ids.slice(session.offset, session.offset + 20).includes(p.id)).sort((a, b) => session.ids.indexOf(a.id) - session.ids.indexOf(b.id))
      const nextCursor = session.offset + 20 < session.ids.length ? crypto.randomUUID() : null
      if (nextCursor) cursors.set(nextCursor, { ...session, offset: session.offset + 20 })
      value = { requestId: session.requestId, policyVersion: 'demo-fixtures', degraded: false, items: list.map((post) => ({ type: 'post', id: post.id, post })), nextCursor }
    }
  } else if (root === 'context') value = context()
  else if (root === 'bindings') {
    const type = url.searchParams.get('type'), id = url.searchParams.get('id')
    const catalog = type === 'course' ? demoCourses : type === 'lab' ? demoLabs : type === 'resource' ? demoResources : type === 'article' ? demoArticles : type === 'theme' ? demoThemes : type === 'challenge' ? demoChallenges : []
    const content = catalog.find((item) => item.slug === id)
    if (!content) throw new Error('关联内容不存在或不属于当前演示用户')
    const routes: Record<string, string> = { course: `/courses/${id}`, lab: `/labs/${id}`, resource: `/resources?resource=${id}`, article: `/frontier?article=${id}`, theme: `/topics?theme=${id}`, challenge: `/assessments?challenge=${id}` }
    const binding = { type: type!, id: id!, title: content.title, route: routes[type!], status: 'published' }
    const course = demoCourses.find((c) => binding.type === 'course' && c.slug === binding.id)
    value = { binding, topicIds: course ? topics.filter((topic) => topic.themeId === course.theme).slice(0, 3).map((topic) => topic.id) : [] }
  }
  else if (root === 'interests') { const selected = (body as { themeIds: string[] }).themeIds; topics.forEach((t) => { if (selected.includes(t.themeId || '')) t.following = true }); value = context() }
  else if (root === 'signals') value = { recorded: true }
  else if (root === 'topics') {
    if (action === 'follow') { const topic = topics.find((t) => t.id === id)!; topic.following = method === 'PUT'; value = { active: topic.following } }
    else if (action === 'posts') value = visible().filter((p) => p.topics.some((t) => t.slug === id))
    else value = topics
  } else if (root === 'bookmarks') value = visible().filter((p) => p.viewerState.bookmarked)
  else if (root === 'notifications') {
    const available = notifications.filter((n) => n.entityType !== 'post' || visible().some((p) => p.id === n.entityId))
    if (id === 'unread-count') value = { count: available.filter((n) => !n.readAt).length }
    else if (method === 'GET') value = available
    else { notifications.forEach((n) => { if (id === 'read-all' || n.id === id) n.readAt ||= new Date().toISOString() }); value = { read: true } }
  }
  else if (root === 'profile') { const input = body as CommunityProfileDto; bio = input.bio; headline = input.headline; allowAchievementDrafts = !!input.allowAchievementDrafts; value = {} }
  else if (root === 'users') {
    if (action === 'following') value = authors.filter((author) => following.has(author.id))
    else if (action === 'follow') { if (method === 'PUT') following.add(id); else following.delete(id); posts.forEach((p) => { p.viewerState.followingAuthor = following.has(p.author.id) }); value = { active: method === 'PUT' } }
    else if (action === 'mute' || action === 'block') { muted.add(id); value = { hidden: true } }
    else if (action === 'posts' || action === 'answers') value = visible(action === 'posts' && id === authors[0].id).filter((p) => action === 'posts' ? p.author.id === id : comments.some((c) => c.postId === p.id && c.author.id === id && !c.deleted))
    else { const user = authors.find((a) => a.id === id); if (!user || muted.has(id)) throw new Error('用户不存在或不可见'); const own = id === authors[0].id; value = { ...user, bio: own ? bio : '在学习、实训与讨论中一起成长。', headline: own ? headline : '', expertiseTopics: [], ...(own ? { allowAchievementDrafts } : {}), postCount: visible().filter((p) => p.author.id === id).length, followerCount: fixtures.follows.filter((f) => f.followee === id).length, followingCount: own ? following.size : fixtures.follows.filter((f) => f.follower === id).length, following: following.has(id), topics: own ? topics.filter((t) => t.following) : [] } }
  } else if (root === 'questions') { const post = requirePost(id); requireOwner(post.author.id); if (!comments.some((c) => c.id === fourth && c.postId === id && !c.deleted)) throw new Error('回答不可用'); if (post.question) { post.question.status = 'solved'; post.question.acceptedCommentId = fourth; comments.forEach((c) => { if (c.postId === id) c.accepted = c.id === fourth }) }; value = post }
  else if (root === 'comments') {
    const comment = comments.find((c) => c.id === id)
    if (!comment || muted.has(comment.author.id)) throw new Error('评论不存在')
    const post = requirePost(comment.postId)
    if (action === 'report') return { reported: true } as T
    if (!action) requireOwner(comment.author.id)
    if (action === 'like') { comment.liked = method === 'PUT'; comment.likes = comment.liked ? 1 : 0 }
    else if (method === 'DELETE') { if (!comment.deleted) post.stats.comments--; comment.deleted = true; comment.body = '该评论已删除'; comment.contentBlocks = []; comment.accepted = false; if (post.question?.acceptedCommentId === id) { post.question.acceptedCommentId = null; post.question.status = 'open' } }
    else if (method === 'PATCH') { comment.contentBlocks = (body as { contentBlocks: CommunityContentBlock[] }).contentBlocks; comment.body = text(comment.contentBlocks) }
    value = comment
  } else if (root === 'posts') {
    const post = id ? requirePost(id) : undefined
    if (action === 'comments') {
      if (method === 'POST') {
        const input = body as { contentBlocks: CommunityContentBlock[]; parentId?: string }
        if (post!.status === 'draft') throw new Error('草稿不能评论')
        if (input.parentId && !comments.some((c) => c.id === input.parentId && c.postId === id && !c.parentId && !c.deleted)) throw new Error('仅支持两级评论')
        const comment: CommunityCommentDto = { id: crypto.randomUUID(), postId: id, author: authors[0], parentId: input.parentId || null, rootId: input.parentId || null, body: text(input.contentBlocks), contentBlocks: input.contentBlocks, deleted: false, likes: 0, liked: false, accepted: false, createdAt: new Date().toISOString() }
        comments.push(comment); post!.stats.comments++; value = comment
      } else {
        const rows = comments.filter((c) => c.postId === id), order = new Map(rows.map((row, index) => [row.id, index]))
        value = rows.sort((a, b) => (order.get(a.parentId || a.id) ?? rows.length) - (order.get(b.parentId || b.id) ?? rows.length) || Number(!!a.parentId) - Number(!!b.parentId)).map((c) => muted.has(c.author.id) ? { ...c, body: '该评论不可见', contentBlocks: [], deleted: true } : c)
      }
    } else if (action === 'reactions' || action === 'bookmark') {
      const state = action === 'bookmark' ? 'bookmarked' : fourth === 'like' ? 'liked' : 'markedUseful'
      const stat = action === 'bookmark' ? 'bookmarks' : fourth === 'like' ? 'likes' : 'useful'
      const active = method === 'PUT'
      if (post!.viewerState[state] !== active) post!.stats[stat] += active ? 1 : -1
      post!.viewerState[state] = active; value = { active }
    } else if (action === 'hide' || action === 'not-interested') { visible().filter((p) => action === 'hide' ? p.id === id : p.type === post!.type).forEach((p) => hidden.add(p.id)); value = {} }
    else if (action === 'report') value = { reported: true }
    else if (method === 'DELETE') { requireOwner(post!.author.id); posts = posts.filter((p) => p.id !== id); value = { deleted: true } }
    else if (method === 'POST' || method === 'PATCH') {
      const input = body as CommunityPostInput, now = new Date().toISOString()
      if (post) requireOwner(post.author.id)
      const saved: CommunityPostDetailDto = { ...structuredClone(initialPosts[0]), id: id || crypto.randomUUID(), type: input.type, status: input.status, visibility: input.visibility, title: input.title || null, body: text(input.contentBlocks), bodyPreview: text(input.contentBlocks).slice(0, 320), contentBlocks: input.contentBlocks, author: authors[0], topics: topics.filter((t) => input.topicIds.includes(t.id)), stats: post?.stats || { likes: 0, comments: 0, bookmarks: 0, useful: 0 }, viewerState: post?.viewerState || { liked: false, markedUseful: false, bookmarked: false, followingAuthor: false }, question: input.type === 'question' ? post?.question || { status: 'open', acceptedCommentId: null, teacherAnswered: false } : null, bindings: await Promise.all(input.bindings.map(async (binding) => (await mockCommunity<{ binding: CommunityPostDetailDto['bindings'][number] }>(`/bindings/context?${new URLSearchParams({ type: binding.type, id: binding.id })}`, 'GET')).binding)), publishedAt: post?.publishedAt || now, editedAt: id ? now : null }
      posts = [saved, ...posts.filter((p) => p.id !== saved.id)]; value = saved
    } else value = id ? post : visible().filter((p) => (!url.searchParams.get('keyword') || `${p.title} ${p.body}`.includes(url.searchParams.get('keyword')!)) && (!url.searchParams.get('bindingId') || p.bindings.some((b) => b.id === url.searchParams.get('bindingId'))))
  }
  if (value === undefined) throw new Error('演示数据中没有此内容')
  return JSON.parse(JSON.stringify(value)) as T
}
