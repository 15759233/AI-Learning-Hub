import type { Article, Course, Lab, ResourceItem } from '../../types'
import { articles, courses, labs, resources } from '../../data/mock'
import { dataMode, request } from './client'
import { reactive } from 'vue'

interface Page<T> { items: T[]; page: number; pageSize: number; total: number }
export interface PublicTheme {
  id: string
  title: string
  description: string
  paths: Array<{ id: string; name: string; stages: Array<{ id: string; name: string; stageType: string }> }>
}
export interface HomepageModule {
  id: string
  moduleKey: string
  name: string
  config: Record<string, unknown>
  items: unknown[]
}
interface Homepage { modules: HomepageModule[]; updatedAt: string; version: number }

export const publicThemes = reactive<PublicTheme[]>([])
export const homepageModules = reactive<HomepageModule[]>([])

const replace = <T>(target: T[], source: T[]) => target.splice(0, target.length, ...source)

export async function hydratePublicContent() {
  if (dataMode !== 'api') return { mode: 'mock' as const }
  const [themePage, coursePage, labPage, resourcePage, articlePage, homepage] = await Promise.all([
    request<Page<PublicTheme>>('/themes?pageSize=100'),
    request<Page<Course>>('/courses?pageSize=100'),
    request<Page<Lab>>('/labs?pageSize=100'),
    request<Page<ResourceItem>>('/resources?pageSize=100'),
    request<Page<Article>>('/articles?pageSize=100'),
    request<Homepage>('/public/homepage'),
  ])
  replace(publicThemes, themePage.items)
  replace(courses, coursePage.items)
  replace(labs, labPage.items)
  replace(resources, resourcePage.items)
  replace(articles, articlePage.items)
  replace(homepageModules, homepage.modules)
  return { mode: 'api' as const, homepage }
}

export const contentApi = {
  course: (slug: string) => request<Record<string, unknown>>(`/courses/${encodeURIComponent(slug)}`),
  lab: (slug: string) => request<Record<string, unknown>>(`/labs/${encodeURIComponent(slug)}`),
}
