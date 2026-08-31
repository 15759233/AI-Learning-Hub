import type { HomepageResolvedItemDto, PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import { apiCatalogCover, type CoverData } from '../media/catalog'
import { landingAssets, type LandingAssetKey } from '../assets/landing/manifest'

// 旧首页显式coverOverride仍由服务端合并到data.cover；只兼容白名单键，不为API内容猜图。
export const itemCover = (item: HomepageResolvedItemDto): CoverData => {
  const media = apiCatalogCover(item.data as CoverData)
  return typeof media.cover === 'string' && Object.hasOwn(landingAssets, media.cover)
    ? { ...media, cover: landingAssets[media.cover as LandingAssetKey] } : media
}

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
  challenge: `/assessments?challenge=${item.slug}`,
  community_post: `/community/post/${item.slug}`,
  community_topic: `/community/topic/${item.slug}`,
  community_user: `/community/user/${item.slug}`,
}[item.targetType])
