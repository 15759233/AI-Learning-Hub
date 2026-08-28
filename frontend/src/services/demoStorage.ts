import type { DemoAppState, FavoriteReference, FavoriteType } from '../types'

const STORAGE_KEY = 'ai-maker-campus:demo-state'
const VERSION = 1

const courseIds = new Set(['llm-zero', 'agent-first', 'image-create', 'api-deploy', 'iot-car', 'model-security', 'rag-practice', 'multi-agent', 'image-start'])
const labIds = new Set(['agent-workbench', 'rag-lab', 'model-service', 'monitor', 'linux-command', 'git-cli', 'hardware', 'sensor', 'campus-agent', 'energy-analysis', 'image-web'])
const articleIds = new Set(['agent-tools', 'moe', 'multimodal', 'robot', 'safety', 'rag', 'function-call', 'alignment'])

const defaultState = (): DemoAppState => ({
  version: VERSION,
  favorites: [],
  courseProgress: { 'llm-zero': 60, 'agent-first': 35 },
  labProgress: { 'agent-workbench': 60 },
  notes: {},
  profile: {
    nickname: '造梦少年',
    bio: '用 AI 探索世界，用创造改变未来。',
  },
  plans: [{
    id: 'plan-llm',
    name: '大模型进阶学习计划',
    targetDate: '2026-09-30',
    status: '进行中',
  }],
  recentCourses: ['llm-zero', 'agent-first'],
  recentLabs: ['agent-workbench'],
  submittedLabs: [],
  assessmentRecords: [],
})

const favoriteType = (id: string): FavoriteType => {
  if (labIds.has(id)) return 'lab'
  if (articleIds.has(id)) return 'article'
  if (id.startsWith('resource-')) return 'resource'
  return courseIds.has(id) ? 'course' : 'resource'
}

const migrateLegacyFavorites = (): FavoriteReference[] => {
  try {
    const value = JSON.parse(localStorage.getItem('ai-hub:favorites') || '[]') as unknown
    return Array.isArray(value)
      ? value.filter((id): id is string => typeof id === 'string').map((id) => ({ type: favoriteType(id), id }))
      : []
  } catch {
    return []
  }
}

export const loadDemoState = (): DemoAppState => {
  const fallback = defaultState()
  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null') as Partial<DemoAppState> | null
    const legacyNote = localStorage.getItem('ai-hub:course-note') || ''
    if (!stored || stored.version !== VERSION) {
      return {
        ...fallback,
        favorites: migrateLegacyFavorites(),
        notes: legacyNote ? { 'llm-zero': legacyNote } : {},
      }
    }
    return {
      ...fallback,
      ...stored,
      version: VERSION,
      favorites: Array.isArray(stored.favorites) ? stored.favorites : fallback.favorites,
      courseProgress: { ...fallback.courseProgress, ...stored.courseProgress },
      labProgress: { ...fallback.labProgress, ...stored.labProgress },
      notes: { ...fallback.notes, ...stored.notes },
      profile: { ...fallback.profile, ...stored.profile },
      plans: Array.isArray(stored.plans) ? stored.plans : fallback.plans,
      recentCourses: Array.isArray(stored.recentCourses) ? stored.recentCourses : fallback.recentCourses,
      recentLabs: Array.isArray(stored.recentLabs) ? stored.recentLabs : fallback.recentLabs,
      submittedLabs: Array.isArray(stored.submittedLabs) ? stored.submittedLabs : fallback.submittedLabs,
      assessmentRecords: Array.isArray(stored.assessmentRecords) ? stored.assessmentRecords : fallback.assessmentRecords,
    }
  } catch {
    return { ...fallback, favorites: migrateLegacyFavorites() }
  }
}

export const saveDemoState = (state: DemoAppState) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...state, version: VERSION }))
}

export const clearDemoState = () => {
  localStorage.removeItem(STORAGE_KEY)
}
