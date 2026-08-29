import type { PageResult } from '@ai-learning-hub/contracts'

export interface ContentPageQuery {
  page?: number
  pageSize?: number
  keyword?: string
}

export const normalizePageQuery = (
  input: ContentPageQuery = {},
  current: ContentPageQuery = {},
): Required<ContentPageQuery> => ({
  page: input.page ?? current.page ?? 1,
  pageSize: input.pageSize ?? current.pageSize ?? 12,
  keyword: input.keyword ?? current.keyword ?? '',
})

export const pageKey = (query: Required<ContentPageQuery>) =>
  `${query.page}:${query.pageSize}:${query.keyword.trim().toLocaleLowerCase('zh-CN')}`

export const pageUrl = (path: string, query: Required<ContentPageQuery>) => {
  const search = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
  })
  if (query.keyword.trim()) search.set('keyword', query.keyword.trim())
  return `${path}?${search}`
}

export const localPage = <T extends { title: string; description?: string; summary?: string }>(
  source: T[],
  query: Required<ContentPageQuery>,
): PageResult<T> => {
  const keyword = query.keyword.trim().toLocaleLowerCase('zh-CN')
  const filtered = keyword
    ? source.filter((item) => `${item.title} ${item.description || ''} ${item.summary || ''}`.toLocaleLowerCase('zh-CN').includes(keyword))
    : source
  const start = (query.page - 1) * query.pageSize
  return {
    items: filtered.slice(start, start + query.pageSize),
    page: query.page,
    pageSize: query.pageSize,
    total: filtered.length,
  }
}
