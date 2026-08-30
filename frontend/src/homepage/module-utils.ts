import type { HomepageResolvedItemDto, PublicHomepageModuleDto } from '@ai-learning-hub/contracts'

export const configText = (module: PublicHomepageModuleDto, key: string, fallback = '') => {
  const value = module.config[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

export const configArray = <T>(module: PublicHomepageModuleDto, key: string): T[] => {
  const value = module.config[key]
  return Array.isArray(value) ? value as T[] : []
}

export const itemText = (item: HomepageResolvedItemDto, key: string, fallback = '') => {
  const value = item.data[key]
  return typeof value === 'string' && value.trim() ? value : fallback
}

export const itemNumber = (item: HomepageResolvedItemDto, key: string, fallback = 0) => {
  const value = item.data[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export const itemPath = (item: HomepageResolvedItemDto) => ({
  theme: `/topics?category=${encodeURIComponent(item.title)}`,
  course: `/courses/${item.slug}`,
  lab: `/labs/${item.slug}`,
  resource: `/resources?preview=${item.slug}`,
  article: `/frontier?article=${item.slug}`,
  challenge: '/assessments',
  community_post: `/community/post/${item.slug}`,
  community_topic: `/community/topic/${item.slug}`,
  community_user: `/community/user/${item.slug}`,
}[item.targetType])
