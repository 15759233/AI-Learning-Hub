import { defineStore } from 'pinia'
import { authApi, type StudentUser } from '../services/api/auth'
import { dataMode } from '../services/api/client'

export const useAuthStore = defineStore('auth', {
  state: () => ({
    user: JSON.parse(sessionStorage.getItem('student-user') || 'null') as StudentUser | null,
    loading: false,
    error: '',
    dataMode,
  }),
  actions: {
    async restore() {
      if (dataMode !== 'api' || !sessionStorage.getItem('student-access-token')) return
      try {
        const user = await authApi.me()
        if (!user.roles.includes('student')) throw new Error('该账号不是学生账号')
        this.user = user
        sessionStorage.setItem('student-user', JSON.stringify(user))
      } catch {
        await authApi.logout()
        this.user = null
        sessionStorage.removeItem('student-user')
      }
    },
    async login(email: string, password: string) {
      this.loading = true
      this.error = ''
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
      await authApi.logout()
      this.user = null
      sessionStorage.removeItem('student-user')
    },
  },
})
