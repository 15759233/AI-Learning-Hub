import type { DemoAppState } from '../types'

export const createEmptyLearningState = (): DemoAppState => ({
  version: 1,
  favorites: [],
  courseProgress: {},
  labProgress: {},
  notes: {},
  profile: { nickname: '', bio: '' },
  plans: [],
  recentCourses: [],
  recentLabs: [],
  submittedLabs: [],
  assessmentRecords: [],
})
