import {
  demoAchievements,
  demoActivities,
  demoArticles,
  demoCertificates,
  demoChallenges,
  demoCourses,
  demoHomepageModules,
  demoKnowledgeConcepts,
  demoLabs,
  demoLearningPlans,
  demoResources,
  demoStudents,
  demoThemes,
  fixtureMinimums,
} from '@ai-learning-hub/demo-fixtures'
import { describe, expect, it } from 'vitest'

const unique = <T>(items: T[]) => new Set(items).size === items.length

describe('统一演示数据集', () => {
  it('达到页面填充最低规模且 slug 稳定唯一', () => {
    expect(demoThemes.length).toBeGreaterThanOrEqual(fixtureMinimums.themes)
    expect(demoCourses.length).toBeGreaterThanOrEqual(fixtureMinimums.courses)
    expect(demoLabs.length).toBeGreaterThanOrEqual(fixtureMinimums.labs)
    expect(demoLabs.filter((item) => item.labType === 'project').length).toBeGreaterThanOrEqual(fixtureMinimums.makerProjects)
    expect(demoResources.length).toBeGreaterThanOrEqual(fixtureMinimums.resources)
    expect(demoArticles.length).toBeGreaterThanOrEqual(fixtureMinimums.articles)
    expect(demoChallenges.length).toBeGreaterThanOrEqual(fixtureMinimums.challenges)
    expect(demoKnowledgeConcepts.length * 4).toBeGreaterThanOrEqual(fixtureMinimums.questions)
    expect(demoStudents.length).toBeGreaterThanOrEqual(fixtureMinimums.students)
    expect(demoAchievements.length).toBeGreaterThanOrEqual(fixtureMinimums.achievements)
    expect(demoCertificates.length).toBeGreaterThanOrEqual(fixtureMinimums.certificates)
    expect(demoLearningPlans.length).toBeGreaterThanOrEqual(fixtureMinimums.learningPlans)
    expect(demoActivities.length).toBeGreaterThanOrEqual(fixtureMinimums.activities)
    expect(unique(demoCourses.map((item) => item.slug))).toBe(true)
    expect(unique(demoLabs.map((item) => item.slug))).toBe(true)
    expect(unique(demoResources.map((item) => item.slug))).toBe(true)
  })

  it('首页恰好保留 12 个领域模块且具备完整配置', () => {
    expect(demoHomepageModules).toHaveLength(12)
    expect(unique(demoHomepageModules.map((item) => item.moduleKey))).toBe(true)
    for (const module of demoHomepageModules) {
      expect(module.config).toHaveProperty('layoutVariant')
      expect(module.config).toHaveProperty('displayLimit')
    }
  })

  it('业务标题不包含占位语义', () => {
    const titles = [...demoCourses, ...demoLabs, ...demoResources, ...demoArticles, ...demoChallenges].map((item) => item.title)
    expect(titles.some((title) => /^(课程|资源|文章|测试数据|示例标题)\s*\d*$/.test(title))).toBe(false)
  })
})
