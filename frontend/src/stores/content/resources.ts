import type { PageResult, ResourceDetailDto, ResourceSummaryDto } from '@ai-learning-hub/contracts'
import { defineStore } from 'pinia'
import { resources as mockResources } from '../../data/mock'
import { dataMode, request } from '../../services/api/client'
import type { ResourceItem } from '../../types'
import { localPage, normalizePageQuery, pageKey, pageUrl, type ContentPageQuery } from './paging'

export const mapResource = (item: ResourceSummaryDto): ResourceItem => ({
  id: item.slug,
  title: item.title,
  category: item.category,
  theme: String(item.data.theme || '尚未配置') as ResourceItem['theme'],
  difficulty: String(item.data.difficulty || '尚未配置') as ResourceItem['difficulty'],
  format: item.format as ResourceItem['format'],
  featured: Boolean(item.data.featured),
  downloads: item.downloads,
  updatedAt: item.updatedAt.slice(0, 10),
  cover: typeof item.data.cover === 'string' ? item.data.cover : undefined,
  coverVariant: typeof item.data.coverVariant === 'string' ? item.data.coverVariant : undefined,
  icon: typeof item.data.icon === 'string' ? item.data.icon : undefined,
})

export const mapSelectedResource = (item: ResourceDetailDto | null, slug: unknown) => {
  if (typeof slug !== 'string' || !slug || item?.slug !== slug) return undefined
  return mapResource(item)
}

export const useResourcesStore = defineStore('content-resources', {
  state: () => ({
    items: [] as ResourceItem[],
    selected: null as ResourceDetailDto | null,
    page: 1,
    pageSize: 12,
    total: 0,
    keyword: '',
    cache: {} as Record<string, PageResult<ResourceItem>>,
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
        const result = localPage(mockResources.map((item) => ({ ...item })), query)
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
        return
      }
      this.loading = true
      this.error = ''
      try {
        const page = await request<PageResult<ResourceSummaryDto>>(pageUrl('/resources', query))
        const result = { ...page, items: page.items.map(mapResource) }
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
      }
      catch (error) { this.error = error instanceof Error ? error.message : '资源加载失败'; throw error }
      finally { this.loading = false }
    },
    async detail(slug: string) {
      if (dataMode !== 'api') return null
      this.selected = await request<ResourceDetailDto>(`/resources/${encodeURIComponent(slug)}`)
      return this.selected
    },
  },
})
