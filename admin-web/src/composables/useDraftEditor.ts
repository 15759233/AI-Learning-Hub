import type {
  AdminDomainCreateInputMap,
  AdminDomainDtoMap,
  AdminDomainUpdateInputMap,
} from '@ai-learning-hub/contracts'
import { api } from '../services/api'

export const useDraftEditor = <K extends keyof AdminDomainDtoMap>(kind: K) => ({
  createDraft: (value: AdminDomainCreateInputMap[K]) =>
    api<AdminDomainDtoMap[K]>(`/admin/${kind}`, { method: 'POST', body: JSON.stringify(value) }),
  saveDraft: (item: AdminDomainDtoMap[K], value: AdminDomainUpdateInputMap[K]) =>
    api<AdminDomainDtoMap[K]>(`/admin/${kind}/${item.databaseId}`, { method: 'PATCH', body: JSON.stringify(value) }),
})
