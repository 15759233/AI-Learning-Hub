import { defineStore } from 'pinia'
import { authApi, type StudentUser } from '../services/api/auth'
import { dataMode } from '../services/api/client'
import { useLearningStore } from './learning'
import { useCommunityStore } from './community'
import { resetCommunityMock } from '../services/api/community.mock'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as StudentUser | null,
    loading: false,
    error: '',
    dataMode,
    initialized: false,
  }),
  actions: {
    clearSession() {
      sessionStorage.removeItem('student-access-token')
      sessionStorage.removeItem('student-user')
      this.user = null
      if (dataMode === 'mock') resetCommunityMock()
      useCommunityStore().clear()
      useLearningStore().clearAccountState()
    },
    async restore() {
      if (this.initialized) return
      this.initialized = true
      if (dataMode !== 'api') {
        this.user = sessionStorage.getItem('community-demo-login') ? { id: 'student', email: '', displayName: '造梦少年', roles: ['student'], permissions: [] } : null
        return
      }
      this.user = null
      sessionStorage.removeItem('student-user')
      useLearningStore().clearAccountState()
      try {
        const user = await authApi.me()
        if (!user.roles.includes('student')) throw new Error('该账号不是学生账号')
        this.user = user
        sessionStorage.setItem('student-user', JSON.stringify(user))
      } catch {
        this.clearSession()
      }
    },
    async login(email: string, password: string) {
      this.loading = true
      this.error = ''
      if (dataMode === 'api') this.clearSession()
      try {
        if (dataMode === 'mock') { this.user = { id: 'student', email: '', displayName: '造梦少年', roles: ['student'], permissions: [] }; sessionStorage.setItem('community-demo-login', 'true'); return }
        this.user = await authApi.login(email, password)
        if (!this.user.roles.includes('student')) {
          await authApi.logout()
          this.user = null
          throw new Error('该账号不是学生账号')
        }
        sessionStorage.setItem('student-user', JSON.stringify(this.user))
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
