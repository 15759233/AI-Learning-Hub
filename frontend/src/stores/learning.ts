import { defineStore } from 'pinia'
import { behaviorApi } from '../services/api/behavior'
import { dataMode } from '../services/api/client'
import { loadDemoState, saveDemoState } from '../services/demoStorage'
import type { FavoriteType, LearningPlan } from '../types'
import { createEmptyLearningState } from './learningState'

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))
const notifyError = (error: unknown) => window.dispatchEvent(new CustomEvent('api-error', {
  detail: { message: error instanceof Error ? error.message : '真实 API 操作失败' },
}))

export type AccountSyncState = 'mock' | 'anonymous' | 'syncing' | 'synced' | 'sync-error'

export const useLearningStore = defineStore('learning', {
  state: () => ({
    ...(dataMode === 'mock' ? loadDemoState() : createEmptyLearningState()),
    accountSyncState: (dataMode === 'mock' ? 'mock' : 'anonymous') as AccountSyncState,
  }),
  actions: {
    persist() {
      if (dataMode === 'mock') saveDemoState(this.$state)
    },
    clearAccountState(nextState: Exclude<AccountSyncState, 'mock' | 'synced'> = 'anonymous') {
      if (dataMode === 'api') {
        this.$reset()
        this.accountSyncState = nextState
      }
    },
    isFavorite(type: FavoriteType, id: string) {
      return this.favorites.some((item) => item.type === type && item.id === id)
    },
    async toggleFavorite(type: FavoriteType, id: string) {
      const index = this.favorites.findIndex((item) => item.type === type && item.id === id)
      if (dataMode === 'api') {
        try {
          if (index >= 0) await behaviorApi.removeFavorite(type, id)
          else await behaviorApi.addFavorite(type, id)
        } catch (error) {
          notifyError(error)
          return false
        }
      }
      if (index >= 0) this.favorites.splice(index, 1)
      else this.favorites.push({ type, id })
      if (dataMode === 'mock') this.persist()
      return true
    },
    async saveNote(courseId: string, note: string, lessonId?: string) {
      if (dataMode === 'api') {
        try {
          if (lessonId) await behaviorApi.saveLessonNote(lessonId, note)
          else await behaviorApi.saveCourseNote(courseId, note)
        } catch (error) { notifyError(error); return false }
      }
      this.notes[lessonId ? `${courseId}:${lessonId}` : courseId] = note
      if (dataMode === 'mock') this.persist()
      return true
    },
    async completeCourseStep(courseId: string, lessonId: string | number, total = 1) {
      let progress = clamp((Number(lessonId) / total) * 100)
      if (dataMode === 'api') {
        try {
          const result = await behaviorApi.saveLessonProgress(String(lessonId), true)
          progress = result.courseProgress.percentage
        } catch (error) { notifyError(error); return false }
      }
      this.courseProgress[courseId] = progress
      this.recentCourses = [courseId, ...this.recentCourses.filter((id) => id !== courseId)].slice(0, 6)
      if (dataMode === 'mock') this.persist()
      return true
    },
    async setLabProgress(labId: string, value: number) {
      this.labProgress[labId] = clamp(value)
      this.recentLabs = [labId, ...this.recentLabs.filter((id) => id !== labId)].slice(0, 6)
      if (dataMode === 'mock') this.persist()
      return true
    },
    async submitLab(labId: string) {
      if (!this.submittedLabs.includes(labId)) this.submittedLabs.push(labId)
      this.labProgress[labId] = 100
      this.recentLabs = [labId, ...this.recentLabs.filter((id) => id !== labId)].slice(0, 6)
      if (dataMode === 'mock') this.persist()
      return true
    },
    saveProfile(nickname: string, bio: string) {
      if (dataMode !== 'mock') return
      this.profile = { nickname: nickname.trim(), bio: bio.trim() }
      this.persist()
    },
    async addPlan(plan: LearningPlan) {
      if (dataMode === 'api') {
        try {
          const created = await behaviorApi.addPlan(plan.name, plan.targetDate) as { id: string; title: string; targetDate: string; status: string }
          this.plans.unshift({
            id: created.id,
            name: created.title,
            targetDate: created.targetDate.slice(0, 10),
            status: created.status === 'completed' ? '已完成' : '进行中',
          })
          return true
        } catch (error) { notifyError(error); return false }
      }
      this.plans.unshift(plan)
      this.persist()
      return true
    },
    async togglePlan(planId: string) {
      const plan = this.plans.find((item) => item.id === planId)
      if (!plan) return
      const status = plan.status === '进行中' ? '已完成' : '进行中'
      if (dataMode === 'api') {
        try { await behaviorApi.updatePlan(planId, { status: status === '已完成' ? 'completed' : 'active', progress: status === '已完成' ? 100 : 0 }) } catch (error) { notifyError(error); return false }
      }
      plan.status = status
      if (dataMode === 'mock') this.persist()
      return true
    },
    recordAssessment(kind: 'challenge' | 'assessment' | 'practice', id: string) {
      if (dataMode === 'api') return
      this.assessmentRecords.unshift({ id, kind, createdAt: new Date().toISOString() })
      this.assessmentRecords = this.assessmentRecords.slice(0, 20)
      this.persist()
    },
    async syncFromApi() {
      if (dataMode !== 'api') return false
      this.clearAccountState('syncing')
      try {
        const [favorites, plans, growth] = await Promise.all([behaviorApi.favorites(), behaviorApi.plans(), behaviorApi.growth()]) as [
          Array<{ targetType: FavoriteType; targetId: string }>,
          Array<Record<string, unknown>>,
          {
            points: number
            courseProgress: Array<{ progress: number; course: { slug: string }; updatedAt: string }>
            notes: Array<{ content: string; lessonId: string | null; course: { slug: string } }>
            labRuns: Array<{ status: string; progress: number; lab: { slug: string }; startedAt: string }>
            assessmentAttempts: Array<{ id: string; submittedAt: string }>
            achievements: unknown[]
            certificates: unknown[]
            knowledgeStats: Array<{ accuracy: number }>
          },
        ]
        const next = createEmptyLearningState()
        next.favorites = favorites.map((item) => ({ type: item.targetType, id: item.targetId }))
        next.plans = plans.map((plan) => ({
          id: String(plan.id),
          name: String(plan.title),
          targetDate: String(plan.targetDate).slice(0, 10),
          status: plan.status === 'completed' ? '已完成' : '进行中',
        }))
        next.courseProgress = Object.fromEntries(growth.courseProgress.map((item) => [item.course.slug, item.progress]))
        next.notes = Object.fromEntries(growth.notes.map((item) => [
          item.lessonId ? `${item.course.slug}:${item.lessonId}` : item.course.slug,
          item.content,
        ]))
        next.labProgress = Object.fromEntries(growth.labRuns.map((item) => [item.lab.slug, item.progress]))
        next.recentCourses = [...growth.courseProgress].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).map((item) => item.course.slug)
        next.recentLabs = growth.labRuns.map((item) => item.lab.slug)
        next.submittedLabs = growth.labRuns.filter((item) => item.status === 'submitted').map((item) => item.lab.slug)
        next.assessmentRecords = growth.assessmentAttempts.map((item) => ({ id: item.id, kind: 'assessment' as const, createdAt: item.submittedAt }))
        next.serverGrowth = {
          points: growth.points,
          achievements: growth.achievements.length,
          certificates: growth.certificates.length,
          knowledgeAccuracy: growth.knowledgeStats.length
            ? Math.round(growth.knowledgeStats.reduce((total, item) => total + item.accuracy, 0) / growth.knowledgeStats.length)
            : 0,
        }
        this.$patch(next)
        this.accountSyncState = 'synced'
        return true
      } catch (error) {
        this.clearAccountState('sync-error')
        notifyError(error)
        return false
      }
    },
  },
})
