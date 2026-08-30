import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiError, AUTH_SESSION_CLEARED_EVENT, request, restoreRefresh } from '../src/services/api/client'
const stored = new Map<string, string>()
beforeEach(() => {
  stored.clear(); stored.set('student-access-token', 'local-test-token')
  vi.stubGlobal('sessionStorage', { getItem: (key: string) => stored.get(key) || null, setItem: (key: string, value: string) => stored.set(key, value), removeItem: (key: string) => stored.delete(key) })
  vi.stubGlobal('window', new EventTarget())
})
afterEach(() => vi.unstubAllGlobals())
describe('真实HTTP客户端会话边界', () => {
  it('刷新503不清空会话，网络错误不回退演示数据', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 503 })))
    await expect(restoreRefresh()).rejects.toMatchObject({ status: 503 })
    expect(stored.has('student-access-token')).toBe(true)
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('offline')))
    await expect(request('/me')).rejects.toBeInstanceOf(ApiError)
    expect(stored.has('student-access-token')).toBe(true)
  })
  it('刷新401清空旧凭据且广播重新登录门禁', async () => {
    const listener = vi.fn(); window.addEventListener(AUTH_SESSION_CLEARED_EVENT, listener)
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{}', { status: 401 })))
    expect(await restoreRefresh()).toBe(false)
    expect(stored.has('student-access-token')).toBe(false); expect(listener).toHaveBeenCalledOnce()
  })
  it('并发刷新仅一条请求，完成后下一次能够重新刷新', async () => {
    const fetcher = vi.fn().mockImplementation(async () => new Response(JSON.stringify({ code: 0, data: { accessToken: 'renewed-test-token' } })))
    vi.stubGlobal('fetch', fetcher)
    await Promise.all([restoreRefresh(), restoreRefresh(), restoreRefresh()])
    expect(fetcher).toHaveBeenCalledOnce()
    await restoreRefresh()
    expect(fetcher).toHaveBeenCalledTimes(2)
  })
})
