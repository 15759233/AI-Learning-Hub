import type { PageResult, ThemeDetailDto, ThemeSummaryDto } from '@ai-learning-hub/contracts'
import { defineStore } from 'pinia'
import { dataMode, request } from '../../services/api/client'
import { normalizePageQuery, pageKey, pageUrl, type ContentPageQuery } from './paging'

export const useThemesStore = defineStore('content-themes', {
  state: () => ({
    items: [] as ThemeSummaryDto[],
    selected: null as ThemeDetailDto | null,
    page: 1,
    pageSize: 12,
    total: 0,
    keyword: '',
    cache: {} as Record<string, PageResult<ThemeSummaryDto>>,
    loading: false,
    error: '',
  }),
  actions: {
    async load(input: ContentPageQuery = {}, force = false) {
      if (dataMode !== 'api') return
      const query = normalizePageQuery(input, this)
      const key = pageKey(query)
      const cached = this.cache[key]
      if (cached && !force) {
        Object.assign(this, cached, { keyword: query.keyword })
        return
      }
      this.loading = true
      this.error = ''
      try {
        const result = await request<PageResult<ThemeSummaryDto>>(pageUrl('/themes', query))
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
      }
      catch (error) { this.error = error instanceof Error ? error.message : '主题加载失败'; throw error }
      finally { this.loading = false }
    },
    async detail(slug: string) {
      if (dataMode !== 'api') return null
      this.selected = await request<ThemeDetailDto>(`/themes/${encodeURIComponent(slug)}`)
      return this.selected
    },
  },
})
