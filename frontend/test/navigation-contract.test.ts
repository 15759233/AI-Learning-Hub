import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { communityNavigation } from '../src/community/labels'
const source = (name: string) => readFileSync(new URL(`../src/${name}`, import.meta.url), 'utf8')
describe('声明式导航契约', () => {
  it('社区桌面与移动Logo回门户，独立社区导航仍进入社区', () => {
    const layout = source('layouts/CommunityLayout.vue')
    const logos = [...layout.matchAll(/<RouterLink class="brand[^"]*" to="([^"]+)"/g)]
    expect(logos).toHaveLength(2); expect(logos.map((match) => match[1])).toEqual(['/welcome', '/welcome'])
    expect(communityNavigation.find((item) => item.label === '社区首页')?.path).toBe('/community')
  })
  it('每条路由声明Meta，守卫不写Meta，移动导航不用数组下标', () => {
    const router = source('router.ts')
    for (const line of router.split('\n').filter((value) => value.trim().startsWith('{ path:'))) expect(line).toMatch(/meta: \{.*title:.*layout:.*requiresAuth:|meta: \{.*title:.*requiresAuth:.*layout:/)
    expect(router).not.toMatch(/to\.meta\.\w+\s*=/)
    expect(source('layouts/CommunityLayout.vue')).not.toMatch(/communityNavigation\[/)
    expect(communityNavigation.filter((item) => item.mobile).map((item) => item.mobileOrder).sort()).toEqual([1, 2, 4, 5])
  })
  it('学习者头像样式不再覆盖同级账号状态标签', () => {
    const css = readFileSync(new URL('../../admin-web/src/styles.css', import.meta.url), 'utf8')
    expect(css).toContain('.learner-list > button > span:first-child,')
    expect(css).not.toContain('.learner-list > button > span,')
  })
})
