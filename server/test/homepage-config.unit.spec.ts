import 'reflect-metadata'
import { BadRequestException, ValidationPipe, type ExecutionContext } from '@nestjs/common'
import { GUARDS_METADATA } from '@nestjs/common/constants'
import { LANDING_DEFAULT_CONFIG, landingConfigIssues } from '@ai-learning-hub/contracts'
import { describe, expect, it } from 'vitest'
import { HomepageConfigGuard } from '../src/modules/homepage/homepage-config.guard'
import { UpdateHomepageModuleDto } from '../src/modules/homepage/homepage.dto'
import { AdminHomepageController } from '../src/modules/homepage/homepage.controller'
import { AuthGuard } from '../src/modules/auth/auth.guard'
import { PermissionsGuard } from '../src/modules/auth/permissions.guard'

const context = (body: unknown) => ({ switchToHttp: () => ({ getRequest: () => ({ body }) }) }) as ExecutionContext
const guard = new HomepageConfigGuard()
const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })
const transform = async (body: unknown) => {
  guard.canActivate(context(body))
  return pipe.transform(body, { type: 'body', metatype: UpdateHomepageModuleDto }) as Promise<UpdateHomepageModuleDto>
}

describe('首页配置原始字段边界', () => {
  it('在ValidationPipe吞掉constructor之前拒绝非法字段，保留原400语义', async () => {
    const body = { config: { ...LANDING_DEFAULT_CONFIG.landing_hero, constructor: 'unexpected' } }
    await expect(transform(body)).rejects.toMatchObject({ status: 400 })
    expect(Object.hasOwn(body.config, 'constructor')).toBe(true)
    const sanitized = await pipe.transform(structuredClone(body), { type: 'body', metatype: UpdateHomepageModuleDto })
    expect(Object.hasOwn(sanitized.config, 'constructor')).toBe(false)
  })

  it('拒绝配置和能力数组深处的三类保留键，不改写对象或污染原型', () => {
    for (const key of ['constructor', '__proto__', 'prototype']) {
      for (const raw of [
        `{"config":{"${key}":{"polluted":true}}}`,
        `{"config":{"items":[{"title":"安全文案","${key}":{"polluted":true}}]}}`,
      ]) {
        const body = JSON.parse(raw), before = JSON.stringify(body)
        expect(() => guard.canActivate(context(body))).toThrow(BadRequestException)
        expect(JSON.stringify(body)).toBe(before)
        expect(Object.prototype).not.toHaveProperty('polluted')
        expect(Object.getPrototypeOf(body.config)).toBe(Object.prototype)
      }
    }
  })

  it('合法文字可包含保留词，正常配置与其他DTO转换不受影响', async () => {
    const config = { ...LANDING_DEFAULT_CONFIG.landing_hero, description: '讲解 constructor、prototype 与 __proto__ 的区别' }
    const result = await transform({ config, enabled: true, sortOrder: '0' })
    expect(result.config).toEqual(config)
    expect(result.enabled).toBe(true)
    expect(result.sortOrder).toBe(0)
    expect(landingConfigIssues('landing_hero', result.config)).toEqual([])
    expect(await transform({ enabled: false })).toMatchObject({ enabled: false })
  })

  it('普通未知配置字段仍由原契约拒绝，DTO白名单和对象类型校验不放宽', async () => {
    const result = await transform({ config: { ...LANDING_DEFAULT_CONFIG.landing_hero, debug: true } })
    expect(landingConfigIssues('landing_hero', result.config)).toContain('包含未支持字段')
    for (const body of [{ roles: ['admin'] }, { config: [] }, { config: 'invalid' }, { enabled: 'false' }]) {
      await expect(transform(body)).rejects.toMatchObject({ status: 400 })
    }
  })

  it('前置检查仅绑定首页配置写入口，原认证和权限守卫保留', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminHomepageController)).toEqual([AuthGuard, PermissionsGuard])
    for (const method of ['create', 'update'] as const) expect(Reflect.getMetadata(GUARDS_METADATA, AdminHomepageController.prototype[method])).toEqual([HomepageConfigGuard])
    expect(Reflect.getMetadata(GUARDS_METADATA, AdminHomepageController.prototype.item)).toBeUndefined()
  })
})
