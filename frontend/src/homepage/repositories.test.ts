import { LANDING_MODULE_KEYS } from '@ai-learning-hub/contracts'
import { describe, expect, it } from 'vitest'
import { ApiHomepageRepository, homepageRepository, MockHomepageRepository } from './repositories'

describe('首页 Repository', () => {
  it('Mock 与 API 只切换数据源，不切换渲染结构', () => {
    expect(homepageRepository('mock')).toBe(MockHomepageRepository)
    expect(homepageRepository('api')).toBe(ApiHomepageRepository)
  })

  it('Mock Repository 生成完整 PublicHomepageDto', async () => {
    const homepage = await MockHomepageRepository.load()
    expect(homepage.modules.map((module) => module.moduleKey)).toEqual(LANDING_MODULE_KEYS)
    expect(homepage.modules).toHaveLength(5)
    expect(homepage.modules.find((module) => module.moduleKey === 'landing_capabilities')?.config.items).toHaveLength(6)
    expect(homepage.modules.find((module) => module.moduleKey === 'landing_featured')?.items).toHaveLength(3)
    expect(homepage.modules.find((module) => module.moduleKey === 'landing_community_overview')?.items.filter((item) => item.targetType === 'community_topic')).toHaveLength(5)
    expect(homepage.modules.find((module) => module.moduleKey === 'landing_community_overview')?.items.filter((item) => item.targetType === 'community_user')).toHaveLength(4)
    expect(homepage).toEqual(await MockHomepageRepository.load())
  })
})
