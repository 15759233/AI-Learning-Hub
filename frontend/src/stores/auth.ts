import { defineStore } from 'pinia'
import { authApi, type StudentUser } from '../services/api/auth'
import { ApiError, dataMode, restoreRefresh } from '../services/api/client'
import type { AuthUser, RegisterInput, RegistrationConfigDto } from '@ai-learning-hub/contracts'
import { useLearningStore } from './learning'
import { useCommunityStore } from './community'
import { useAuthUiStore } from './authUi'
export type AuthState = 'idle' | 'restoring' | 'authenticated' | 'anonymous' | 'error'
const demoUser = (): AuthUser => ({ id: 'student', username: 'student', email: '', displayName: '造梦少年', roles: ['student'], permissions: [], avatarUrl: null, school: null, major: null, onboardingCompleted: true, emailVerificationRequired: false })

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as StudentUser | null,
    loading: false,
    error: '',
    dataMode,
    initialized: false,
    authState: 'idle' as AuthState, restoreError: '', lastRestoreAt: 0,
    restorePromise: null as Promise<void> | null,
    registrationConfig: null as RegistrationConfigDto | null,
  }),
  getters: { onboardingRequired: (state) => !!state.user && !state.user.onboardingCompleted },
  actions: {
    clearSession() {
      sessionStorage.removeItem('student-access-token')
      sessionStorage.removeItem('student-user')
      sessionStorage.removeItem('student-after-onboarding')
      useAuthUiStore().afterOnboardingAction = null
      this.user = null
      this.authState = 'anonymous'
      useCommunityStore().clear()
      useLearningStore().clearAccountState()
    },
    restore(force = false): Promise<void> {
      if (this.restorePromise) return this.restorePromise
      if (!force && ['authenticated', 'anonymous'].includes(this.authState)) return Promise.resolve()
      this.authState = 'restoring'; this.restoreError = ''
      this.restorePromise = Promise.resolve().then(async () => {
        try {
          if (dataMode === 'mock') {
            this.user = sessionStorage.getItem('community-demo-login') ? JSON.parse(localStorage.getItem('community-demo-user') || 'null') || demoUser() : null
          } else {
            if (!sessionStorage.getItem('student-access-token') && !await restoreRefresh()) { this.clearSession(); return }
            const user = await authApi.me()
            if (!user.roles.includes('student')) { await authApi.logout(); throw new ApiError('该账号不是学生账号', 401) }
            this.user = user
          }
          this.authState = this.user ? 'authenticated' : 'anonymous'; this.initialized = true
        } catch (error) {
          if (error instanceof ApiError && error.status === 401) this.clearSession()
          else { this.authState = 'error'; this.restoreError = error instanceof Error ? error.message : '网络暂时不可用，请重新连接'; this.initialized = false }
        } finally { this.lastRestoreAt = Date.now(); this.restorePromise = null }
      })
      return this.restorePromise
    },
    async loadRegistrationConfig() {
      this.registrationConfig = dataMode === 'mock' ? { mode: 'open', emailVerification: false, agreementVersion: '2026-08-30', passwordMinLength: 8, schoolRequired: false, mailAvailable: false, inviteAvailable: false } : await authApi.registrationConfig()
      return this.registrationConfig
    },
    async register(input: RegisterInput) {
      this.loading = true; this.error = ''
      try {
        if (dataMode === 'mock') {
          this.user = { ...demoUser(), displayName: input.displayName, email: input.email.trim().toLowerCase(), onboardingCompleted: false }
          localStorage.setItem('community-demo-user', JSON.stringify(this.user)); sessionStorage.setItem('community-demo-login', 'true')
        } else this.user = await authApi.register(input)
        this.authState = 'authenticated'; this.initialized = true
        if (dataMode === 'api') void useLearningStore().syncFromApi().catch(() => window.dispatchEvent(new CustomEvent('api-error', { detail: { message: '账号已创建，学习资料暂未同步，请稍后重试' } })))
      } catch (error) { this.error = error instanceof Error ? error.message : '注册失败'; throw error }
      finally { this.loading = false }
    },
    async login(email: string, password: string, remember = true) {
      this.loading = true
      this.error = ''
      if (dataMode === 'api') this.clearSession()
      try {
        if (dataMode === 'mock') { this.user = JSON.parse(localStorage.getItem('community-demo-user') || 'null') || demoUser(); this.authState = 'authenticated'; this.initialized = true; sessionStorage.setItem('community-demo-login', 'true'); return }
        this.user = await authApi.login(email, password, remember)
        if (!this.user.roles.includes('student')) {
          await authApi.logout()
          this.user = null
          throw new Error('该账号不是学生账号')
        }
        sessionStorage.setItem('student-user', JSON.stringify(this.user))
        this.authState = 'authenticated'; this.initialized = true
      } catch (error) {
        this.error = error instanceof Error ? error.message : '登录失败'
        throw error
      } finally { this.loading = false }
    },
    async logout() {
      try {
        if (dataMode === 'api') await authApi.logout()
      } finally {
        sessionStorage.removeItem('community-demo-login')
        this.clearSession()
      }
    },
  },
})
