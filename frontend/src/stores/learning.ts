import { defineStore } from 'pinia'

const readList = (key: string) => {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]') as string[]
  } catch {
    return []
  }
}

export const useLearningStore = defineStore('learning', {
  state: () => ({
    favorites: readList('ai-hub:favorites'),
    courseProgress: { 'llm-zero': 60, 'agent-first': 35 } as Record<string, number>,
    labProgress: { 'agent-workbench': 60 } as Record<string, number>,
    notes: localStorage.getItem('ai-hub:course-note') || '',
  }),
  actions: {
    toggleFavorite(id: string) {
      this.favorites = this.favorites.includes(id)
        ? this.favorites.filter((item) => item !== id)
        : [...this.favorites, id]
      localStorage.setItem('ai-hub:favorites', JSON.stringify(this.favorites))
    },
    saveNote(note: string) {
      this.notes = note
      localStorage.setItem('ai-hub:course-note', note)
    },
    completeCourseStep(courseId: string) {
      this.courseProgress[courseId] = Math.min(100, (this.courseProgress[courseId] || 0) + 10)
    },
    setLabProgress(labId: string, value: number) {
      this.labProgress[labId] = Math.min(100, Math.max(0, value))
    },
  },
})
