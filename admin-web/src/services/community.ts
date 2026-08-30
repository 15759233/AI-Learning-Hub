import type { CommunityAdminInspectionDto, CommunityAdminReportDto, CommunityAdminSummaryDto, CommunityAuthorDto, CommunityFeedPolicyDto, CommunityModerationInput, CommunityPostDetailDto, CommunityPostInput, CommunityTopicDto } from '@ai-learning-hub/contracts'
import { api } from './api'
import { communityModerationPayload } from './community-payload'
const call = <T>(path: string, method = 'GET', input?: unknown) => api<T>(`/admin/community${path}`, { method, ...(input ? { body: JSON.stringify(input) } : {}) })
export interface AdminCommunityComment { id: string; postId: string; body: string; status: string; author: { id: string; displayName: string }; createdAt: string }
export const communityAdminApi = {
  summary: () => call<CommunityAdminSummaryDto>('/summary'),
  posts: (question = false, keyword = '') => call<CommunityPostDetailDto[]>(`/posts?${new URLSearchParams({ type: question ? 'question' : 'all', keyword })}`),
  inspection: (id: string) => call<CommunityAdminInspectionDto>(`/posts/${id}`),
  comments: () => call<AdminCommunityComment[]>('/comments'),
  topics: () => call<CommunityTopicDto[]>('/topics'),
  saveTopic: (input: Omit<CommunityTopicDto, 'id' | 'postCount' | 'followerCount' | 'following'> & { reason: string }, id?: string) => call(id ? `/topics/${id}` : '/topics', id ? 'PATCH' : 'POST', { ...input, themeId: input.themeId || undefined }),
  reports: () => call<CommunityAdminReportDto[]>('/reports'),
  handle: (id: string, input: CommunityModerationInput) => call(`/reports/${id}/handle`, 'POST', communityModerationPayload(input)),
  moderate: (target: 'post' | 'comment', id: string, input: CommunityModerationInput) => call(`/${target}/${id}/moderate`, 'POST', communityModerationPayload(input)),
  officials: () => call<Array<CommunityAuthorDto & { expertiseTopics: string[] }>>('/official'),
  verify: (id: string, verifiedType: string, expertiseTopics: string[], reason: string) => call(`/official/${id}`, 'PATCH', { verifiedType, expertiseTopics, reason }),
  policy: () => call<CommunityFeedPolicyDto>('/policy'),
  updatePolicy: (parameter: string, value: number, reason: string) => call('/policy', 'PATCH', { parameter, value, reason }),
  officialPost: (id: string, input: CommunityPostInput & { reason: string }) => call(`/official/${id}/posts`, 'POST', input),
  editPost: (id: string, input: CommunityPostInput & { reason: string }) => call(`/posts/${id}`, 'PATCH', input),
  async image(id: string) {
    const { url } = await call<{ url: string }>(`/media/${id}`)
    const source = url.startsWith('/api/') && import.meta.env.VITE_API_BASE_URL?.startsWith('http') ? new URL(url, import.meta.env.VITE_API_BASE_URL).href : url
    const result = await fetch(source, { headers: url.startsWith('/api/') ? { authorization: `Bearer ${sessionStorage.getItem('admin-access-token') || ''}` } : {} })
    if (!result.ok) throw new Error('图片读取失败')
    return URL.createObjectURL(await result.blob())
  },
}
