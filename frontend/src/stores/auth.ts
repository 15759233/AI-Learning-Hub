import { defineStore } from 'pinia'
import { authApi, type StudentUser } from '../services/api/auth'
import { dataMode } from '../services/api/client'
import { useLearningStore } from './learning'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: null as StudentUser | null,
    loading: false,
    error: '',
    dataMode,
  }),
  actions: {
    clearSession() {
      if (dataMode !== 'api') return
      sessionStorage.removeItem('student-access-token')
      sessionStorage.removeItem('student-user')
      this.user = null
      useLearningStore().clearAccountState()
    },
    async restore() {
      if (dataMode !== 'api') return
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
        await authApi.logout()
      } finally {
        this.clearSession()
      }
    },
  },
})
