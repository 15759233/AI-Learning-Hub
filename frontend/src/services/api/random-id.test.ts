import { afterEach, describe, expect, it, vi } from 'vitest'
import { randomId } from './random-id'

afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })
describe('普通HTTP安全随机ID', () => {
  it('缺少randomUUID时使用安全随机源，1000次生成格式正确且不重复', () => {
    const source = globalThis.crypto
    const getRandomValues = vi.fn(source.getRandomValues.bind(source))
    vi.stubGlobal('crypto', { getRandomValues })
    const unsafe = vi.spyOn(Math, 'random')
    expect(crypto.randomUUID).toBeUndefined()
    const ids = Array.from({ length: 1000 }, randomId)
    expect(new Set(ids).size).toBe(1000)
    expect(ids.every((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id))).toBe(true)
    expect(getRandomValues).toHaveBeenCalledTimes(1000)
    expect(unsafe).not.toHaveBeenCalled()
  })
  it.each([[0, '00000000-0000-4000-8000-000000000000'], [255, 'ffffffff-ffff-4fff-bfff-ffffffffffff']] as const)('随机字节=%s时仅设置v4版本与variant位', (byte, expected) => {
    vi.stubGlobal('crypto', { getRandomValues: (bytes: Uint8Array) => bytes.fill(byte) })
    expect(randomId()).toBe(expected)
  })
  it.each([undefined, {}])('没有安全随机源%j时拒绝降级', (source) => {
    vi.stubGlobal('crypto', source)
    const unsafe = vi.spyOn(Math, 'random')
    expect(randomId).toThrow('不支持安全随机数')
    expect(unsafe).not.toHaveBeenCalled()
  })
})
