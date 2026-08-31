import type { CatalogCoverData } from '@ai-learning-hub/contracts'

export type Category = '大模型 LLM' | 'AI Agent' | '图像生成' | '模型部署' | '智能硬件' | 'AI 安全'

export interface Course extends Partial<CatalogCoverData> {
  id: string
  title: string
  description: string
  category: Category
  level: '入门' | '初级' | '中级' | '高级' | '尚未配置'
  hours?: number
  learners?: number
  progress?: number
  mode: '视频' | '图文' | '实战项目' | '互动实验' | '尚未配置'
  cover?: string
  coverVariant?: string
  accent?: string
  icon?: string
}

export interface Lab extends Partial<CatalogCoverData> {
  id: string
  title: string
  description: string
  category: '模型部署' | 'AI Agent' | 'Linux 命令' | '智能硬件' | '综合项目'
  level: '入门' | '中级' | '进阶' | '尚未配置'
  minutes?: number
  steps?: number
  completion?: number
  learners?: number
  cover?: string
  coverVariant?: string
  accent?: string
  icon?: string
}

export interface ResourceItem extends Partial<CatalogCoverData> {
  id: string
  title: string
  category: string
  theme: string
  difficulty: '入门' | '中级' | '进阶' | '高级' | '尚未配置'
  format: string
  featured: boolean
  downloads: number
  updatedAt: string
  downloadUrl?: string
  cover?: string
  coverVariant?: string
  accent?: string
  icon?: string
}

export interface Article extends Partial<CatalogCoverData> {
  id: string
  title: string
  summary: string
  category: string
  readMinutes?: number
  publishedAt: string
  content: string[]
  recommendations?: string[]
  cover?: string
  coverVariant?: string
  accent?: string
  icon?: string
}

export type FavoriteType = 'course' | 'lab' | 'resource' | 'article'

export interface FavoriteReference {
  type: FavoriteType
  id: string
}

export interface DemoProfile {
  nickname: string
  bio: string
}

export interface LearningPlan {
  id: string
  name: string
  targetDate: string
  status: '进行中' | '已完成'
}

export interface AssessmentRecord {
  id: string
  kind: 'challenge' | 'assessment' | 'practice'
  createdAt: string
}

export interface DemoAppState {
  version: number
  favorites: FavoriteReference[]
  courseProgress: Record<string, number>
  labProgress: Record<string, number>
  notes: Record<string, string>
  profile: DemoProfile
  plans: LearningPlan[]
  recentCourses: string[]
  recentLabs: string[]
  submittedLabs: string[]
  assessmentRecords: AssessmentRecord[]
  serverGrowth?: {
    points: number
    achievements: number
    certificates: number
    knowledgeAccuracy: number
  }
}
