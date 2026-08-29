import { request } from './client'

export interface StudentUser {
  id: string
  email: string
  displayName: string
  roles: string[]
}

export const authApi = {
  async login(email: string, password: string) {
    const result = await request<{ user: StudentUser; accessToken: string }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }, false)
    sessionStorage.setItem('student-access-token', result.accessToken)
    return result.user
  },
  async logout() {
    await request('/auth/logout', { method: 'POST' }).catch(() => undefined)
    sessionStorage.removeItem('student-access-token')
  },
  me: () => request<StudentUser>('/me'),
}
