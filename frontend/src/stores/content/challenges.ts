import type { ChallengeDetailDto, ChallengeSummaryDto, PageResult } from '@ai-learning-hub/contracts'
import { defineStore } from 'pinia'
import { dataMode, request } from '../../services/api/client'
import { normalizePageQuery, pageKey, pageUrl, type ContentPageQuery } from './paging'

export const useChallengesStore = defineStore('content-challenges', {
  state: () => ({
    items: [] as ChallengeSummaryDto[],
    selected: null as ChallengeDetailDto | null,
    page: 1,
    pageSize: 12,
    total: 0,
    keyword: '',
    cache: {} as Record<string, PageResult<ChallengeSummaryDto>>,
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
        const result = await request<PageResult<ChallengeSummaryDto>>(pageUrl('/challenges', query))
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
      }
      catch (error) { this.error = error instanceof Error ? error.message : '挑战加载失败'; throw error }
      finally { this.loading = false }
    },
    async detail(slug: string) {
      if (dataMode !== 'api') return null
      this.selected = await request<ChallengeDetailDto>(`/challenges/${encodeURIComponent(slug)}`)
      return this.selected
    },
  },
})
