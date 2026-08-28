import { defineStore } from 'pinia'
import { loadDemoState, saveDemoState } from '../services/demoStorage'
import type { DemoAppState, FavoriteType, LearningPlan } from '../types'

const clamp = (value: number) => Math.min(100, Math.max(0, Math.round(value)))

export const useLearningStore = defineStore('learning', {
  state: (): DemoAppState => loadDemoState(),
  actions: {
    persist() {
      saveDemoState(this.$state)
    },
    isFavorite(type: FavoriteType, id: string) {
      return this.favorites.some((item) => item.type === type && item.id === id)
    },
    toggleFavorite(type: FavoriteType, id: string) {
      const index = this.favorites.findIndex((item) => item.type === type && item.id === id)
      if (index >= 0) this.favorites.splice(index, 1)
      else this.favorites.push({ type, id })
      this.persist()
    },
    saveNote(courseId: string, note: string) {
      this.notes[courseId] = note
      this.persist()
    },
    completeCourseStep(courseId: string, lesson: number, total: number) {
      this.courseProgress[courseId] = clamp((lesson / total) * 100)
      this.recentCourses = [courseId, ...this.recentCourses.filter((id) => id !== courseId)].slice(0, 6)
      this.persist()
    },
    setLabProgress(labId: string, value: number) {
      this.labProgress[labId] = clamp(value)
      this.recentLabs = [labId, ...this.recentLabs.filter((id) => id !== labId)].slice(0, 6)
      this.persist()
    },
    submitLab(labId: string) {
      if (!this.submittedLabs.includes(labId)) this.submittedLabs.push(labId)
      this.setLabProgress(labId, 100)
    },
    saveProfile(nickname: string, bio: string) {
      this.profile = { nickname: nickname.trim(), bio: bio.trim() }
      this.persist()
    },
    addPlan(plan: LearningPlan) {
      this.plans.unshift(plan)
      this.persist()
    },
    togglePlan(planId: string) {
      const plan = this.plans.find((item) => item.id === planId)
      if (!plan) return
      plan.status = plan.status === '进行中' ? '已完成' : '进行中'
      this.persist()
    },
    recordAssessment(kind: 'challenge' | 'assessment' | 'practice', id: string) {
      this.assessmentRecords.unshift({ id, kind, createdAt: new Date().toISOString() })
      this.assessmentRecords = this.assessmentRecords.slice(0, 20)
      this.persist()
    },
  },
})
