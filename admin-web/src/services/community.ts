import type { AdminCommunityPostQueryDto, PageResult, CommunityAdminInspectionDto, CommunityAdminReportDto, CommunityAdminSummaryDto, CommunityAuthorDto, CommunityFeedPolicyDto, CommunityModerationInput, CommunityPostDetailDto, CommunityPostInput, CommunityTopicDto } from '@ai-learning-hub/contracts'
import { api } from './api'
import { communityModerationPayload } from './community-payload'
import { userQueryString } from './users'
const call = <T>(path: string, method = 'GET', input?: unknown) => api<T>(`/admin/community${path}`, { method, ...(input ? { body: JSON.stringify(input) } : {}) })
export interface AdminCommunityComment { id: string; postId: string; body: string; status: string; author: { id: string; displayName: string }; createdAt: string }
export const communityAdminApi = {
  summary: () => call<CommunityAdminSummaryDto>('/summary'),
  posts: (query: AdminCommunityPostQueryDto) => call<PageResult<CommunityPostDetailDto>>(`/posts?${userQueryString(query)}`),
  inspection: (id: string) => call<CommunityAdminInspectionDto>(`/posts/${id}`),
  comments: (query: AdminCommunityPostQueryDto) => call<PageResult<AdminCommunityComment>>(`/comments?${userQueryString(query)}`),
  topics: (query: AdminCommunityPostQueryDto) => call<PageResult<CommunityTopicDto>>(`/topics?${userQueryString(query)}`),
  saveTopic: (input: Omit<CommunityTopicDto, 'id' | 'postCount' | 'followerCount' | 'following'> & { reason: string }, id?: string) => call(id ? `/topics/${id}` : '/topics', id ? 'PATCH' : 'POST', { ...input, themeId: input.themeId || undefined }),
  reports: (query: AdminCommunityPostQueryDto) => call<PageResult<CommunityAdminReportDto>>(`/reports?${userQueryString(query)}`),
  handle: (id: string, input: CommunityModerationInput) => call(`/reports/${id}/handle`, 'POST', communityModerationPayload(input)),
  moderate: (target: 'post' | 'comment', id: string, input: CommunityModerationInput) => call(`/${target}/${id}/moderate`, 'POST', communityModerationPayload(input)),
  officials: (query: AdminCommunityPostQueryDto) => call<PageResult<CommunityAuthorDto & { expertiseTopics: string[]; revision: number }>>(`/users?${userQueryString(query)}`),
  verify: (id: string, verifiedType: string, expertiseTopics: string[], reason: string, expectedRevision: number) => call(`/official/${id}`, 'PATCH', { verifiedType, expertiseTopics, reason, expectedRevision }),
  policy: () => call<CommunityFeedPolicyDto>('/policy'),
  updatePolicy: (parameter: string, value: number, reason: string, expectedRevision?: number) => call('/policy', 'PATCH', { parameter, value, reason, expectedRevision }),
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
