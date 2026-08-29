export enum PublishStatus {
  DRAFT = 'draft',
  REVIEWING = 'reviewing',
  PUBLISHED = 'published',
  ARCHIVED = 'archived',
}

export enum UserStatus {
  ACTIVE = 'active',
  DISABLED = 'disabled',
  LOCKED = 'locked',
}

export enum LabType {
  AGENT = 'agent',
  DEPLOYMENT = 'deployment',
  COMMAND = 'command',
  HARDWARE = 'hardware',
  PROJECT = 'project',
}

export enum LabRunStatus {
  READY = 'ready',
  RUNNING = 'running',
  SUCCESS = 'success',
  FAILED = 'failed',
  STOPPED = 'stopped',
  SUBMITTED = 'submitted',
}

export enum FavoriteTargetType {
  COURSE = 'course',
  LAB = 'lab',
  RESOURCE = 'resource',
  ARTICLE = 'article',
}

export enum QuestionType {
  SINGLE = 'single',
  MULTIPLE = 'multiple',
  TRUE_FALSE = 'true_false',
  SHORT_ANSWER = 'short_answer',
  CODE = 'code',
}

export interface ApiEnvelope<T> {
  code: number
  message: string
  data: T
  requestId: string
}

export interface PageResult<T> {
  items: T[]
  page: number
  pageSize: number
  total: number
}

export interface CatalogItemDto {
  id: string
  databaseId?: string
  slug: string
  title: string
  summary: string
  status: PublishStatus
  sortOrder: number
  publishedAt: string | null
  payload: Record<string, unknown>
  updatedAt: string
}
