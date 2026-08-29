import type {
  HomepageResolvedItemDto,
  PublicHomepageDto,
  PublicHomepageModuleDto,
} from '@ai-learning-hub/contracts'
import {
  demoActivities,
  demoArticles,
  demoChallenges,
  demoCourses,
  demoHomepageModules,
  demoHomepageRelations,
  demoLabs,
  demoResources,
  demoThemes,
} from '@ai-learning-hub/demo-fixtures'
import { request } from '../services/api/client'

const itemsByType = {
  theme: new Map(demoThemes.map((item) => [item.slug, item])),
  course: new Map(demoCourses.map((item) => [item.slug, item])),
  lab: new Map(demoLabs.map((item) => [item.slug, item])),
  resource: new Map(demoResources.map((item) => [item.slug, item])),
  article: new Map(demoArticles.map((item) => [item.slug, item])),
  challenge: new Map(demoChallenges.map((item) => [item.slug, item])),
}

const resolve = (type: string, slug: string): HomepageResolvedItemDto | null => {
  if (!(type in itemsByType)) return null
  const value = itemsByType[type as keyof typeof itemsByType].get(slug)
  if (!value) return null
  return {
    targetType: type as HomepageResolvedItemDto['targetType'],
    slug,
    title: value.title,
    summary: value.summary,
    data: { ...value },
  }
}

export interface HomepageRepository {
  load(): Promise<PublicHomepageDto>
}

export const homepageRepository = (mode: 'mock' | 'api') => mode === 'api' ? ApiHomepageRepository : MockHomepageRepository

export const MockHomepageRepository: HomepageRepository = {
  async load() {
    const modules = demoHomepageModules.map((module, sortOrder): PublicHomepageModuleDto => {
      const config = module.moduleKey === 'student_activity'
        ? { ...module.config, items: demoActivities.slice(0, 6) }
        : module.config
      return {
        id: `mock-homepage-${module.moduleKey}`,
        moduleKey: module.moduleKey,
        name: module.name,
        sortOrder,
        config: { ...config },
        items: demoHomepageRelations[module.moduleKey]
          .map((relation) => resolve(relation.type, relation.slug))
          .filter((item): item is HomepageResolvedItemDto => item !== null),
      }
    })
    return { version: 1, updatedAt: '2026-08-29T00:00:00.000Z', modules }
  },
}

export const ApiHomepageRepository: HomepageRepository = {
  load: () => request<PublicHomepageDto>('/public/homepage'),
}
