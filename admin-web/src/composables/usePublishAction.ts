import { api } from '../services/api'

interface PublishTarget {
  databaseId: string
}

export const usePublishAction = (kind: string) => ({
  publish: (item: PublishTarget) => api(`/admin/${kind}/${item.databaseId}/publish`, { method: 'POST' }),
  archive: (item: PublishTarget) => api(`/admin/${kind}/${item.databaseId}/archive`, { method: 'POST' }),
})
