import { describe, expect, it } from 'vitest'
import { resolveDataMode } from './data-mode'
describe('真实 API 与显式演示模式门禁', () => {
  it('开发默认真实 API，非法模式不得静默 fallback', () => {
    expect(resolveDataMode(undefined, false, 'development')).toBe('api')
    expect(resolveDataMode('api', true, 'production')).toBe('api')
    for (const value of ['invalid', '', 'API']) expect(() => resolveDataMode(value, false, 'development')).toThrow()
  })
  it('普通生产构建只能显式 API，演示产物只能从独立 mock mode 构建', () => {
    expect(() => resolveDataMode(undefined, true, 'production')).toThrow()
    expect(() => resolveDataMode('mock', true, 'production')).toThrow()
    expect(resolveDataMode('mock', true, 'mock')).toBe('mock')
  })
})
