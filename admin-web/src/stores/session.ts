import { defineStore } from 'pinia'
import { api } from '../services/api'

import type { AuthUser as AdminUser, MfaChallengeDto } from '@ai-learning-hub/contracts'

export const useSessionStore = defineStore('session', {
  state: () => ({
    user: null as AdminUser | null,
    initialized: false,
    loading: false,
    error: '',
    mfa: null as MfaChallengeDto | null,
    recoveryCodes: [] as string[],
  }),
  actions: {
    async restore() {
      try {
        const user = await api<AdminUser>('/me')
        this.user = user.permissions.length && user.sessionClient === 'admin' && user.mfaVerified ? user : null
      } catch {
        this.user = null
        sessionStorage.removeItem('admin-access-token')
      } finally {
        this.initialized = true
      }
    },
    async login(identifier: string, password: string) {
      this.loading = true
      this.error = ''
      try {
        this.user = null; this.mfa = null; this.recoveryCodes = []
        sessionStorage.removeItem('admin-access-token')
        this.mfa = await api<MfaChallengeDto>('/admin-auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) }, false)
      } catch (error) {
        this.error = error instanceof Error ? error.message : '登录失败'
        throw error
      } finally {
        this.loading = false
        this.initialized = true
      }
    },
    async verifyMfa(code: string) {
      if (!this.mfa) return
      this.loading = true; this.error = ''
      try {
        const result = await api<{ user: AdminUser; accessToken: string; recoveryCodes?: string[] }>('/admin-auth/mfa', { method: 'POST', body: JSON.stringify({ challenge: this.mfa.challenge, code }) }, false)
        this.user = result.user; this.mfa = null; this.recoveryCodes = result.recoveryCodes || []
        sessionStorage.setItem('admin-access-token', result.accessToken)
      } catch (error) { this.error = error instanceof Error ? error.message : 'MFA 验证失败'; throw error }
      finally { this.loading = false }
    },
    async logout() {
      await api('/admin-auth/logout', { method: 'POST' }, false)
      this.user = null
      this.mfa = null; this.recoveryCodes = []
      sessionStorage.removeItem('admin-user')
      sessionStorage.removeItem('admin-access-token')
    },
  },
})
