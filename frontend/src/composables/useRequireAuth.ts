import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/auth'
import { useAuthUiStore } from '../stores/authUi'
export function ensureAuth(reason: string, action?: () => unknown | Promise<unknown>, redirect?: string) {
  if (useAuthStore().user) return true
  useAuthUiStore().open({ reason, action, redirect: redirect || location.pathname + location.search })
  return false
}
export function useRequireAuth() {
  const auth = useAuthStore(), ui = useAuthUiStore(), route = useRoute()
  return async (input: { reason: string; redirect?: string; action?: () => unknown | Promise<unknown> }) => {
    if (auth.user) return input.action?.()
    ui.open({ ...input, redirect: input.redirect || route.fullPath })
  }
}
