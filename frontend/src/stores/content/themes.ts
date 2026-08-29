import { PublishStatus, type PageResult, type ThemeDetailDto, type ThemeSummaryDto } from '@ai-learning-hub/contracts'
import { demoThemes } from '@ai-learning-hub/demo-fixtures'
import { defineStore } from 'pinia'
import { dataMode, request } from '../../services/api/client'
import { normalizePageQuery, pageKey, pageUrl, type ContentPageQuery } from './paging'

const mockThemes: ThemeDetailDto[] = demoThemes.map((theme) => ({
  id: theme.slug,
  slug: theme.slug,
  title: theme.title,
  summary: theme.summary,
  status: PublishStatus.PUBLISHED,
  sortOrder: demoThemes.indexOf(theme),
  publishedAt: '2026-08-29T00:00:00.000Z',
  updatedAt: '2026-08-29T00:00:00.000Z',
  data: {
    accent: theme.accent,
    coverVariant: theme.coverVariant,
    icon: theme.icon,
    learners: theme.learners,
    courseCount: theme.courseCount,
    hours: theme.hours,
  },
  paths: [{
    id: `${theme.slug}-path`,
    name: `${theme.title}学习路径`,
    description: theme.summary,
    stages: theme.path.map((stage, index) => ({
      id: `${theme.slug}-${stage.key}`,
      stageKey: stage.key,
      name: stage.name,
      description: stage.description,
      stageType: stage.type,
      sortOrder: index,
      unlockRule: { countLabel: stage.countLabel, hours: stage.hours },
      contents: [],
    })),
  }],
}))

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
        if (dataMode === 'mock') {
          const result = { items: mockThemes, page: 1, pageSize: mockThemes.length, total: mockThemes.length }
          this.cache[key] = result
          Object.assign(this, result, { keyword: query.keyword })
          return
        }
        const result = await request<PageResult<ThemeSummaryDto>>(pageUrl('/themes', query))
        this.cache[key] = result
        Object.assign(this, result, { keyword: query.keyword })
      }
      catch (error) { this.error = error instanceof Error ? error.message : '主题加载失败'; throw error }
      finally { this.loading = false }
    },
    async detail(slug: string) {
      this.selected = dataMode === 'mock'
        ? mockThemes.find((item) => item.slug === slug) || null
        : await request<ThemeDetailDto>(`/themes/${encodeURIComponent(slug)}`)
      return this.selected
    },
  },
})
