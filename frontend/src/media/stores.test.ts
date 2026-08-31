import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { demoChallenges } from '@ai-learning-hub/demo-fixtures'
import { publicPageVisualKeys } from '@ai-learning-hub/contracts'
import { usePageVisualsStore } from '../stores/content/page-visuals'
import { useChallengesStore } from '../stores/content/challenges'
import { localCatalogMedia } from './catalog'

const api = vi.hoisted(() => ({ mode: 'api', request: vi.fn() }))
vi.mock('../services/api/client', () => ({ get dataMode() { return api.mode }, request: api.request }))
beforeEach(() => { setActivePinia(createPinia()); api.mode = 'api'; api.request.mockReset() })

describe('页面头图配置与挑战数据源', () => {
  it('公开头图请求去重并缓存同一revision，失败不阻断页面且允许下一次重试', async () => {
    const store = usePageVisualsStore()
    api.request.mockRejectedValueOnce(new Error('配置暂不可用'))
    await store.load()
    expect(store.value).toBeNull()
    expect(store.loaded).toBe(false)
    const config = { revision: 3, heroes: Object.fromEntries(publicPageVisualKeys.map((key) => [key, null])) }
    api.request.mockResolvedValue(config)
    await Promise.all([store.load(), store.load()])
    await store.load()
    expect(api.request).toHaveBeenCalledTimes(2)
    expect(api.request).toHaveBeenLastCalledWith('/public/page-visuals')
    expect(store.value).toEqual(config)
  })

  it('Mock的5挑战可直接按slug读取独立封面，头图不发API请求', async () => {
    api.mode = 'mock'
    await usePageVisualsStore().load()
    const store = useChallengesStore()
    await store.load()
    expect(store.total).toBe(5)
    expect(store.items.map((item) => item.slug)).toEqual(demoChallenges.map((item) => item.slug))
    for (const fixture of demoChallenges) {
      const item = await store.detail(fixture.slug)
      expect(item?.data.cover).toBe(localCatalogMedia(fixture.coverAssetKey)?.url)
      expect(item?.challengeType).toBe(fixture.type)
    }
    expect(await store.detail('不存在的挑战')).toBeNull()
    expect(api.request).not.toHaveBeenCalled()
  })

  it('API空列表保持空，不用Mock挑战或封面补齐', async () => {
    api.request.mockResolvedValue({ items: [], page: 1, pageSize: 12, total: 0 })
    const store = useChallengesStore()
    await store.load()
    expect(store.items).toEqual([])
    expect(store.total).toBe(0)
    expect(api.request).toHaveBeenCalledTimes(1)
  })
})
