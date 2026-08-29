export const dataMode = import.meta.env.VITE_DATA_MODE === 'api' ? 'api' : 'mock'
const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

interface Envelope<T> {
  code: number
  message: string
  data: T
  requestId: string
}

let refreshPromise: Promise<boolean> | null = null
const refresh = async () => {
  const response = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' })
  if (!response.ok) return false
  const body = await response.json() as Envelope<{ accessToken: string }>
  sessionStorage.setItem('student-access-token', body.data.accessToken)
  return true
}

export async function request<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const token = sessionStorage.getItem('student-access-token')
  let response: Response
  try {
    response = await fetch(`${baseUrl}${path}`, {
      ...init,
      credentials: 'include',
      headers: {
        ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
        ...(token ? { authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new Error('真实 API 当前不可用，未回退到 Mock 数据')
  }
  if (response.status === 401 && retry && token) {
    refreshPromise ||= refresh().finally(() => { refreshPromise = null })
    if (await refreshPromise) return request<T>(path, init, false)
  }
  const body = await response.json().catch(() => null) as Envelope<T> | null
  if (!response.ok || !body || body.code !== 0) throw new Error(body?.message || `请求失败（${response.status}）`)
  return body.data
}
