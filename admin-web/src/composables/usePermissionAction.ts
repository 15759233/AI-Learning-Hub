import { computed } from 'vue'
import { useSessionStore } from '../stores/session'

export const usePermissionAction = (permission: string) => {
  const session = useSessionStore()
  return computed(() => Boolean(session.user?.permissions.includes(permission)))
}
