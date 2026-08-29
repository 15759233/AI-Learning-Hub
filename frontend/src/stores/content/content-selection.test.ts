import { PublishStatus, type ArticleDetailDto, type ResourceDetailDto } from '@ai-learning-hub/contracts'
import { describe, expect, it } from 'vitest'
import { mapSelectedArticle } from './articles'
import { mapSelectedResource } from './resources'

const resource = {
  id: 'resource-id',
  slug: 'resource-slug',
  title: '真实资源',
  summary: '资源摘要',
  status: PublishStatus.PUBLISHED,
  sortOrder: 1,
  publishedAt: '2026-08-29T08:00:00.000Z',
  data: {},
  updatedAt: '2026-08-29T08:00:00.000Z',
  category: '学习手册',
  format: 'PDF',
  visibility: 'public',
  downloads: 0,
  views: 0,
  file: null,
  uploadedBy: null,
} satisfies ResourceDetailDto

const article = {
  id: 'article-id',
  slug: 'article-slug',
  title: '真实文章',
  summary: '文章摘要',
  status: PublishStatus.PUBLISHED,
  sortOrder: 1,
  publishedAt: '2026-08-29T08:00:00.000Z',
  data: {},
  updatedAt: '2026-08-29T08:00:00.000Z',
  category: '大模型',
  views: 0,
  recommendations: [],
} satisfies ArticleDetailDto

describe('内容详情空加载窗口', () => {
  it('直接进入列表路由时不把 null selected 交给资源和文章 mapper', () => {
    expect(mapSelectedResource(null, undefined)).toBeUndefined()
    expect(mapSelectedArticle(null, undefined)).toBeUndefined()
  })

  it('详情加载前与旧详情不匹配时保持空态', () => {
    expect(mapSelectedResource(null, resource.slug)).toBeUndefined()
    expect(mapSelectedArticle(null, article.slug)).toBeUndefined()
    expect(mapSelectedResource(resource, 'other-resource')).toBeUndefined()
    expect(mapSelectedArticle(article, 'other-article')).toBeUndefined()
  })

  it('仅在请求 slug 与详情 DTO 匹配后映射真实内容', () => {
    expect(mapSelectedResource(resource, resource.slug)?.id).toBe(resource.slug)
    expect(mapSelectedArticle(article, article.slug)?.id).toBe(article.slug)
  })
})
