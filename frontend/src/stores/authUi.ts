import { defineStore } from 'pinia'
import { safeLoginRedirect } from '../community/redirect'
interface AuthRequest { mode?: 'login' | 'register'; redirect?: string; reason?: string; action?: () => unknown | Promise<unknown> }
export const useAuthUiStore = defineStore('auth-ui', {
  state: () => ({ visible: false, mode: 'login' as 'login' | 'register', redirect: '', reason: '', action: null as AuthRequest['action'] | null, afterOnboardingAction: null as AuthRequest['action'] | null }),
  actions: {
    open(input: AuthRequest = {}) { this.mode = input.mode || 'login'; this.redirect = input.redirect ? safeLoginRedirect(input.redirect) : ''; this.reason = input.reason || ''; this.action = input.action || null; this.visible = true },
    close() { this.visible = false; this.action = null },
  },
})
