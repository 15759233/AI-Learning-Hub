import { PublishStatus, type ChallengeDetailDto, type ChallengeSummaryDto, type PageResult } from '@ai-learning-hub/contracts'
import { demoChallenges } from '@ai-learning-hub/demo-fixtures'
import { defineStore } from 'pinia'
import { dataMode, request } from '../../services/api/client'
import { mockCatalogCover } from '../../media/catalog'
import { localPage, normalizePageQuery, pageKey, pageUrl, type ContentPageQuery } from './paging'

const mockChallenges: ChallengeSummaryDto[] = demoChallenges.map((item, index) => ({
  id: item.slug, slug: item.slug, title: item.title, summary: item.summary,
  challengeType: item.type, targetScore: item.targetScore, rewardPoints: item.rewardPoints,
  status: PublishStatus.PUBLISHED, sortOrder: index, publishedAt: '2026-08-29T00:00:00.000Z', updatedAt: '2026-08-29T00:00:00.000Z',
  data: { ...item, challengeType: item.type, ...mockCatalogCover('challenge', item.type, item.coverAssetKey) },
}))

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
      const query = normalizePageQuery(input, this)
      const key = pageKey(query)
      const cached = this.cache[key]
      if (cached && !force) {
        Object.assign(this, cached, { keyword: query.keyword })
        return
      }
      if (dataMode === 'mock') {
        const result = localPage(mockChallenges, query)
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
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
      if (dataMode === 'mock') {
        this.selected = mockChallenges.find((item) => item.slug === slug) || null
        return this.selected
      }
      this.selected = await request<ChallengeDetailDto>(`/challenges/${encodeURIComponent(slug)}`)
      return this.selected
    },
  },
})
