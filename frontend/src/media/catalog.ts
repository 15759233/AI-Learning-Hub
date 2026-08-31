import type { CatalogCoverData, PublicPageVisualKey, PublicPageVisualsDto, ResolvedMedia } from '@ai-learning-hub/contracts'
import { getCatalogAsset, getDefaultAssetKeys, type CatalogContentType } from '@ai-learning-hub/catalog-assets'

const images = import.meta.glob('../../../packages/catalog-assets/images/**/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export type CoverData = Partial<CatalogCoverData>
export type CoverFrame = Pick<ResolvedMedia, 'url' | 'alt' | 'width' | 'height' | 'focalPoint'>

export function localCatalogMedia(assetKey: string): ResolvedMedia | null {
  const asset = getCatalogAsset(assetKey)
  const url = asset && images[`../../../packages/catalog-assets/${asset.file}`]
  return asset && url ? {
    id: null, url, alt: asset.altText, width: asset.width, height: asset.height,
    focalPoint: { x: asset.focalX, y: asset.focalY },
    source: asset.defaultFor?.some((rule) => rule.contentType === 'global') ? 'global_default'
      : asset.defaultFor?.some((rule) => rule.categoryKey === 'generic') ? 'type_default'
        : asset.defaultFor?.length ? 'category_default' : 'explicit',
  } : null
}

export function mockCatalogCover(contentType: string, categoryKey: string, assetKey?: string | null): CatalogCoverData {
  const fallback = getDefaultAssetKeys(contentType, categoryKey).map(localCatalogMedia).find(Boolean) || null
  const explicit = assetKey ? localCatalogMedia(assetKey) : null
  const media = explicit || fallback
  return {
    cover: media?.url || '', coverAssetId: null, coverAlt: media?.alt || '',
    coverFocalPoint: media?.focalPoint || { x: .5, y: .5 },
    coverSource: explicit ? 'explicit' : media?.source || null, coverFallback: fallback,
  }
}

export function mockFixtureCover(contentType: CatalogContentType, fixture: { slug: string; coverAssetKey?: string; theme?: string; labType?: string; category?: string; type?: string }): CatalogCoverData {
  const category = contentType === 'theme' ? fixture.slug : contentType === 'course' ? fixture.theme
    : contentType === 'lab' ? fixture.labType : contentType === 'challenge' ? fixture.type : fixture.category
  return mockCatalogCover(contentType, category || 'generic', fixture.coverAssetKey)
}

// API封面只透传服务端解析结果；不按slug重新读取Mock内容或选择分类默认图。
export function apiCatalogCover(data: CoverData): CoverData {
  return {
    cover: data.cover, coverAssetId: data.coverAssetId, coverAlt: data.coverAlt,
    coverFocalPoint: data.coverFocalPoint, coverSource: data.coverSource, coverFallback: data.coverFallback,
  }
}

export function safeCoverUrl(value: unknown): string {
  if (typeof value !== 'string' || /[\s\\]/u.test(value) || [...value].some((character) => character.charCodeAt(0) <= 32)) return ''
  if (!/^(?:https?:\/\/|\/(?!\/))/.test(value)) return ''
  try {
    const url = new URL(value, value.startsWith('/') ? 'https://catalog.invalid' : undefined)
    return !url.username && !url.password && ![...url.searchParams.keys()].some((key) => /signature|token|credential|expires|x-amz|x-goog|^sig$/i.test(key)) ? value : ''
  } catch { return '' }
}

export function coverFrames(data: CoverData = {}, image?: string, alt = ''): CoverFrame[] {
  const frames: CoverFrame[] = [
    { url: image || data.cover || '', alt: data.coverAlt || alt, width: 1200, height: 675, focalPoint: data.coverFocalPoint || { x: .5, y: .5 } },
    ...(data.coverFallback ? [data.coverFallback] : []),
    ...[localCatalogMedia('default--global--generic')].filter((item): item is ResolvedMedia => !!item),
  ]
  return frames.filter((frame, index) => safeCoverUrl(frame.url) && frames.findIndex((item) => item.url === frame.url) === index)
}

export function focalPosition(point?: { x: number; y: number }) {
  const clamp = (value: number | undefined) => typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : .5
  return `${clamp(point?.x) * 100}% ${clamp(point?.y) * 100}%`
}

export function pageHeroCover(key: PublicPageVisualKey, visuals?: PublicPageVisualsDto | null): CoverData {
  const fallback = localCatalogMedia(`hero--${key.replace(/HeroAssetId$/, '')}`)
  const configured = visuals?.heroes?.[key]
  const selected = configured && safeCoverUrl(configured.url) ? configured : fallback
  return { cover: selected?.url || '', coverAlt: selected?.alt || '', coverFocalPoint: selected?.focalPoint, coverFallback: fallback }
}
