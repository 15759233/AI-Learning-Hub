import type { ArticleDetailDto, ArticleSummaryDto, PageResult } from '@ai-learning-hub/contracts'
import { defineStore } from 'pinia'
import { articles as mockArticles } from '../../data/mock'
import { dataMode, request } from '../../services/api/client'
import type { Article } from '../../types'
import { apiCatalogCover } from '../../media/catalog'
import { localPage, normalizePageQuery, pageKey, pageUrl, type ContentPageQuery } from './paging'

export const mapArticle = (item: ArticleSummaryDto): Article => ({
  id: item.slug,
  title: item.title,
  summary: item.summary,
  category: item.category as Article['category'],
  readMinutes: typeof item.data.readMinutes === 'number' ? item.data.readMinutes : undefined,
  publishedAt: item.publishedAt?.slice(0, 10) || '',
  content: Array.isArray(item.data.content) ? item.data.content.map(String) : [],
  recommendations: item.recommendations.map((recommendation) => recommendation.positionKey),
  ...apiCatalogCover(item.data),
  coverVariant: typeof item.data.coverVariant === 'string' ? item.data.coverVariant : undefined,
  icon: typeof item.data.icon === 'string' ? item.data.icon : undefined,
})

export const mapSelectedArticle = (item: ArticleDetailDto | null, slug: unknown) => {
  if (typeof slug !== 'string' || !slug || item?.slug !== slug) return undefined
  return mapArticle(item)
}

export const useArticlesStore = defineStore('content-articles', {
  state: () => ({
    items: [] as Article[],
    selected: null as ArticleDetailDto | null,
    page: 1,
    pageSize: 12,
    total: 0,
    keyword: '',
    cache: {} as Record<string, PageResult<Article>>,
    loading: false,
    error: '',
  }),
  actions: {
    async load(input: ContentPageQuery = {}, force = false) {
      const query = normalizePageQuery(input, this)
      const key = pageKey(query)
      const cached = this.cache[key]
      if (cached && !force) {
        Object.assign(this, cached, { keyword: query.keyword })
        return
      }
      if (dataMode === 'mock') {
        const result = localPage(mockArticles.map((item) => ({ ...item })), query)
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
        return
      }
      this.loading = true
      this.error = ''
      try {
        const page = await request<PageResult<ArticleSummaryDto>>(pageUrl('/articles', query))
        const result = { ...page, items: page.items.map(mapArticle) }
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
      }
      catch (error) { this.error = error instanceof Error ? error.message : '资讯加载失败'; throw error }
      finally { this.loading = false }
    },
    async detail(slug: string) {
      if (dataMode !== 'api') return null
      this.selected = await request<ArticleDetailDto>(`/articles/${encodeURIComponent(slug)}`)
      return this.selected
    },
  },
})
