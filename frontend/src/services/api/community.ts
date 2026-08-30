import type { CommunityAuthorDto, CommunityBindingInput, CommunityBindingContextDto, CommunityCommentDto, CommunityCommentInput, CommunityContextDto, CommunityFeedDto, CommunityFeedMode, CommunityNotificationDto, CommunityPostDetailDto, CommunityPostInput, CommunityPostType, CommunityProfileDto, CommunitySignalInput, CommunityTopicDto } from '@ai-learning-hub/contracts'
import { dataMode, request } from './client'
import { mockCommunity } from './community.mock'
import type { AuthUser, CommunityDraftDto, CommunitySearchResultDto, CommunitySearchType, OnboardingInput } from '@ai-learning-hub/contracts'
const demoImages = new Map<string, File>()
const call = <T>(path: string, method = 'GET', body?: unknown): Promise<T> => dataMode === 'api'
  ? request<T>(`/community${path}`, { method, ...(body ? { body: JSON.stringify(body) } : {}) })
  : mockCommunity<T>(path, method, body)
export const communityApi = {
  feed: (mode: CommunityFeedMode, type: CommunityPostType | 'all', cursor?: string) => call<CommunityFeedDto>(`/feed?${new URLSearchParams({ mode, type, ...(cursor ? { cursor } : {}) })}`),
  updates: (since: string, mode: CommunityFeedMode, type: CommunityPostType | 'all') => call<{ count: number }>(`/feed/updates?${new URLSearchParams({ since, mode, type })}`),
  context: () => call<CommunityContextDto>('/context'),
  bindingContext: (binding: CommunityBindingInput) => call<CommunityBindingContextDto>(`/bindings/context?${new URLSearchParams({ type: binding.type, id: binding.id })}`),
  post: (id: string) => call<CommunityPostDetailDto>(`/posts/${id}`),
  save: (input: CommunityPostInput, id?: string) => call<CommunityPostDetailDto>(id ? `/posts/${id}` : '/posts', id ? 'PATCH' : 'POST', input),
  remove: (id: string) => call(`/posts/${id}`, 'DELETE'),
  list: (kind: 'posts' | 'bookmarks' | 'user' | 'answers' | 'topic', id = '', query = '') => call<CommunityPostDetailDto[]>(kind === 'user' || kind === 'answers' ? `/users/${encodeURIComponent(id)}/${kind === 'answers' ? 'answers' : 'posts'}` : kind === 'topic' ? `/topics/${encodeURIComponent(id)}/posts` : `/${kind}${query ? `?${query}` : ''}`),
  comments: (id: string) => call<CommunityCommentDto[]>(`/posts/${id}/comments`),
  comment: (postId: string, input: CommunityCommentInput, id?: string) => call<CommunityCommentDto>(id ? `/comments/${id}` : `/posts/${postId}/comments`, id ? 'PATCH' : 'POST', input),
  removeComment: (id: string) => call(`/comments/${id}`, 'DELETE'),
  accept: (postId: string, id: string) => call(`/questions/${postId}/accept/${id}`, 'POST'),
  reaction: (id: string, kind: 'like' | 'useful' | 'bookmark', active: boolean) => call(`/posts/${id}/${kind === 'bookmark' ? 'bookmark' : `reactions/${kind}`}`, active ? 'PUT' : 'DELETE'),
  commentLike: (id: string, active: boolean) => call(`/comments/${id}/like`, active ? 'PUT' : 'DELETE'),
  follow: (id: string, topic: boolean, active: boolean) => call(`/${topic ? 'topics' : 'users'}/${id}/follow`, active ? 'PUT' : 'DELETE'),
  profile: (username: string) => call<CommunityProfileDto>(`/users/by-username/${encodeURIComponent(username)}`),
  username: (username: string) => call<AuthUser>('/profile/username', 'PATCH', { username }),
  onboarding: (input: OnboardingInput) => call<AuthUser>('/onboarding', 'POST', input),
  schools: () => call<Array<{ id: string; name: string }>>('/onboarding/schools'),
  search: (q: string, type: CommunitySearchType, cursor?: string) => call<CommunitySearchResultDto>(`/search?${new URLSearchParams({ q, type, ...(cursor ? { cursor } : {}) })}`),
  drafts: () => call<CommunityDraftDto[]>('/drafts'),
  saveDraft: (input: CommunityPostInput, id?: string) => call<CommunityPostDetailDto>(id ? `/drafts/${id}` : '/drafts', id ? 'PATCH' : 'POST', { ...input, status: 'draft' }),
  deleteDraft: (id: string) => call(`/drafts/${id}`, 'DELETE'),
  following: (id: string) => call<CommunityAuthorDto[]>(`/users/${encodeURIComponent(id)}/following`),
  updateProfile: (input: Pick<CommunityProfileDto, 'bio' | 'headline' | 'expertiseTopics' | 'allowAchievementDrafts'>) => call<CommunityProfileDto>('/profile', 'PATCH', input),
  topics: () => call<CommunityTopicDto[]>('/topics'),
  interests: (themeIds: string[]) => call<CommunityContextDto>('/interests', 'POST', { themeIds }),
  feedback: (id: string, kind: 'hide' | 'not-interested' | 'mute' | 'block') => call(`/${kind === 'mute' || kind === 'block' ? 'users' : 'posts'}/${id}/${kind}`, 'POST'),
  report: (id: string, reason: string, description: string, comment = false) => call(`/${comment ? 'comments' : 'posts'}/${id}/report`, 'POST', { reason, description }),
  notifications: () => call<CommunityNotificationDto[]>('/notifications'),
  unread: () => call<{ count: number }>('/notifications/unread-count'),
  read: (id?: string) => call(id ? `/notifications/${id}/read` : '/notifications/read-all', 'POST'),
  signals: (input: CommunitySignalInput) => call('/signals', 'POST', input),
  impressions: (items: Array<{ requestId: string; postId: string; dwellMs?: number }>, dwell = false) => call(`/feed/${dwell ? 'dwell' : 'impressions'}`, 'POST', { items }),
  async upload(file: File) {
    if (file.size > 5 * 1024 * 1024 || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || !/\.(png|jpe?g|webp)$/i.test(file.name)) throw new Error('请选择不超过 5MB 的 PNG、JPEG 或 WebP 图片')
    if (dataMode === 'mock') { const id = `demo-image-${crypto.randomUUID()}`; demoImages.set(id, file); return { id } }
    const form = new FormData(); form.append('file', file)
    return request<{ id: string }>('/community/media', { method: 'POST', body: form })
  },
  async image(id: string) {
    if (dataMode === 'mock') { const file = demoImages.get(id); if (!file) throw new Error('演示图片仅保存在当前浏览器会话'); return URL.createObjectURL(file) }
    const { url } = await call<{ url: string }>(`/media/${id}/url`)
    const source = url.startsWith('/api/') && import.meta.env.VITE_API_BASE_URL?.startsWith('http') ? new URL(url, import.meta.env.VITE_API_BASE_URL).href : url
    const response = await fetch(source, { headers: url.startsWith('/api/') ? { authorization: `Bearer ${sessionStorage.getItem('student-access-token') || ''}` } : {} })
    if (!response.ok) throw new Error('图片不可见或已失效')
    return URL.createObjectURL(await response.blob())
  },
}
