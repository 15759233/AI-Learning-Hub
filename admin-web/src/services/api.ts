import type { ApiEnvelope } from '@ai-learning-hub/contracts'

const baseUrl = import.meta.env.VITE_API_BASE_URL || '/api/v1'

export class ApiError extends Error {
  constructor(message: string, readonly status: number) {
    super(message)
  }
}

let refreshPromise: Promise<boolean> | null = null

const refresh = async () => {
  const response = await fetch(`${baseUrl}/auth/refresh`, { method: 'POST', credentials: 'include' })
  if (!response.ok) return false
  const body = await response.json() as ApiEnvelope<{ accessToken: string }>
  sessionStorage.setItem('admin-access-token', body.data.accessToken)
  return true
}

async function responseFor(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const token = sessionStorage.getItem('admin-access-token')
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body instanceof FormData ? {} : { 'content-type': 'application/json' }),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      ...init.headers,
    },
  })
  if (response.status === 401 && retry) {
    refreshPromise ||= refresh().finally(() => { refreshPromise = null })
    if (await refreshPromise) return responseFor(path, init, false)
  }
  return response
}

export async function api<T>(path: string, init: RequestInit = {}, retry = true): Promise<T> {
  const response = await responseFor(path, init, retry)
  const body = await response.json().catch(() => null) as ApiEnvelope<T> | null
  if (!response.ok || !body || body.code !== 0) throw new ApiError(body?.message || `请求失败（${response.status}）`, response.status)
  return body.data
}

export async function apiBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const response = await responseFor(path, { signal })
  if (!response.ok) {
    const body = await response.json().catch(() => null) as ApiEnvelope<unknown> | null
    throw new ApiError(body?.message || `图片读取失败（${response.status}）`, response.status)
  }
  return response.blob()
}
