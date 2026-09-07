import type { AdminCommunityPostQueryDto, PageResult, CommunityAdminInspectionDto, CommunityAdminReportDto, CommunityAdminSummaryDto, CommunityAuthorDto, CommunityEligibilityPolicyDto, CommunityFeedPolicyDto, CommunityModerationInput, CommunityOperation, CommunityOperationRestrictionDto, CommunityPostDetailDto, CommunityPostInput, CommunityTopicDto } from '@ai-learning-hub/contracts'
import { api } from './api'
import { communityModerationPayload } from './community-payload'
import { userQueryString } from './users'
import type { ContentDetectionInput, ContentDetectionPolicy, ContentDetectionResult, ContentDetectionRule, ContentReviewDto } from '@ai-learning-hub/contracts'
const call = <T>(path: string, method = 'GET', input?: unknown, key?: string) => api<T>(`/admin/community${path}`, { method, ...(input ? { body: JSON.stringify(input) } : {}), ...(key ? { headers: { 'idempotency-key': key } } : {}) })
export interface AdminCommunityComment { id: string; postId: string; body: string; status: string; author: { id: string; displayName: string }; createdAt: string }
export const communityAdminApi = {
  contentPolicy: () => call<ContentDetectionPolicy>('/content-policy'),
  contentPolicyHistory: () => call<ContentDetectionPolicy[]>('/content-policy/history'),
  configureContentPolicy: (input: { expectedVersion: number; rules?: ContentDetectionRule[]; rollbackVersion?: number; reason: string }) => call<ContentDetectionPolicy>('/content-policy', 'PATCH', input),
  trialContent: (fields: ContentDetectionInput) => call<ContentDetectionResult & { previewOnly: true; saved: false }>('/content-policy/trial', 'POST', { fields }),
  contentReviews: (page: number, status: string) => call<PageResult<ContentReviewDto>>(`/content-reviews?${userQueryString({ page, pageSize: 20, status })}`),
  contentReview: (id: string) => call<ContentReviewDto>(`/content-reviews/${encodeURIComponent(id)}`),
  decideContent: (id: string, input: { expectedRevision: number; ruleVersion: number; action: 'approve' | 'reject'; reason: string }) => call(`/content-reviews/${encodeURIComponent(id)}/decision`, 'POST', input),
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
  officialPost: (id: string, input: CommunityPostInput & { reason: string }, key?: string) => call<CommunityPostDetailDto>(`/official/${id}/posts`, 'POST', input, key),
  editPost: (id: string, input: CommunityPostInput & { reason: string }, key?: string) => call<CommunityPostDetailDto>(`/posts/${id}`, 'PATCH', input, key),
  restrictions: () => call<CommunityOperationRestrictionDto[]>('/restrictions'),
  createRestriction: (input: { userId: string; operations: Exclude<CommunityOperation, 'read'>[]; startsAt?: string; endsAt: string; reason: string }) => call<CommunityOperationRestrictionDto>('/restrictions', 'POST', input),
  updateRestriction: (id: string, input: { expectedRevision: number; operations: Exclude<CommunityOperation, 'read'>[]; startsAt?: string; endsAt: string; reason: string }) => call(`/restrictions/${id}`, 'PATCH', input),
  revokeRestriction: (id: string, expectedRevision: number, reason: string) => call(`/restrictions/${id}/revoke`, 'POST', { expectedRevision, reason }),
  eligibilityPolicy: () => call<CommunityEligibilityPolicyDto>('/eligibility-policy'),
  updateEligibilityPolicy: (input: { expectedRevision: number; operation: keyof CommunityEligibilityPolicyDto['quotas']; limit: number; windowSeconds: number; reason: string }) => call<CommunityEligibilityPolicyDto>('/eligibility-policy', 'PATCH', input),
  async image(id: string) {
    const { url } = await call<{ url: string }>(`/media/${id}`)
    const source = url.startsWith('/api/') && import.meta.env.VITE_API_BASE_URL?.startsWith('http') ? new URL(url, import.meta.env.VITE_API_BASE_URL).href : url
    const result = await fetch(source, { headers: url.startsWith('/api/') ? { authorization: `Bearer ${sessionStorage.getItem('admin-access-token') || ''}` } : {} })
    if (!result.ok) throw new Error('图片读取失败')
    return URL.createObjectURL(await result.blob())
  },
}
