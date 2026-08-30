import { describe, expect, it } from 'vitest'
import { safeLoginRedirect } from './redirect'
describe('登录跳转仅允许站内地址', () => {
  it('拒绝外部地址、反斜杠和编码控制字符', () => {
    for (const value of ['https://example.com', '//example.com', '/\\example.com', '/%2fexample.com', '/%0aevil', '/', undefined]) expect(safeLoginRedirect(value)).toBe('/community')
    expect(safeLoginRedirect('/courses/llm-zero?lesson=2')).toBe('/courses/llm-zero?lesson=2')
    expect(safeLoginRedirect('/welcome')).toBe('/welcome')
  })
})
