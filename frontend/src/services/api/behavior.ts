import type { FavoriteType } from '../../types'
import { request } from './client'

export const behaviorApi = {
  favorites: () => request<Array<{ targetType: FavoriteType; targetId: string }>>('/me/favorites'),
  addFavorite: (targetType: FavoriteType, targetId: string) => request('/favorites', { method: 'POST', body: JSON.stringify({ targetType, targetId }) }),
  removeFavorite: (targetType: FavoriteType, targetId: string) => request(`/favorites/${targetType}/${encodeURIComponent(targetId)}`, { method: 'DELETE' }),
  saveCourseProgress: (courseId: string, progress: number) => request(`/courses/${encodeURIComponent(courseId)}/progress`, { method: 'PUT', body: JSON.stringify({ progress }) }),
  saveCourseNote: (courseId: string, content: string) => request(`/courses/${encodeURIComponent(courseId)}/note`, { method: 'PUT', body: JSON.stringify({ content }) }),
  startLab: (labId: string) => request<{ id: string }>(`/labs/${encodeURIComponent(labId)}/runs`, { method: 'POST' }),
  actOnLab: (runId: string, action: 'start' | 'next' | 'complete' | 'stop') => request(`/lab-runs/${runId}/actions`, { method: 'POST', body: JSON.stringify({ action }) }),
  submitLab: (runId: string) => request(`/lab-runs/${runId}/submit`, { method: 'POST' }),
  growth: () => request<Record<string, unknown>>('/me/growth'),
  plans: () => request<Array<Record<string, unknown>>>('/me/learning-plans'),
  addPlan: (title: string, targetDate: string) => request('/me/learning-plans', { method: 'POST', body: JSON.stringify({ title, targetDate }) }),
  updatePlan: (id: string, value: Record<string, unknown>) => request(`/me/learning-plans/${id}`, { method: 'PATCH', body: JSON.stringify(value) }),
}
