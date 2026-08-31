import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { NestFactory, Reflector } from '@nestjs/core'
import { ValidationPipe, type INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { createHash, randomBytes } from 'node:crypto'
import { access, readFile } from 'node:fs/promises'
import * as path from 'node:path'
import { hash } from 'bcryptjs'
import sharp from 'sharp'
import cookieParser from 'cookie-parser'
import { AppModule } from '../src/app.module'
import { ApiExceptionFilter } from '../src/common/api-exception.filter'
import { ApiResponseInterceptor } from '../src/common/api-response.interceptor'
import { bootstrapDatabase } from '../src/modules/persistence/bootstrap'
import { STORAGE_SERVICE, type StorageService } from '../src/modules/storage/storage.types'
import { MediaResolverService } from '../src/modules/media/media-resolver.service'
import { ContentReferenceService } from '../src/common/content-reference/content-reference.service'
import { collectArchivedMedia } from '../src/modules/media/media-gc'
import { changeDemoContent } from '../src/modules/media/demo-data'
import type { AuthSessionDto } from '@ai-learning-hub/contracts'

if (!process.env.DATABASE_URL?.includes('127.0.0.1:55439/community_')) throw new Error('媒体E2E只允许隔离社区测试数据库')
const db = new PrismaClient(), prefix = `media-${Date.now()}`, password = `Media8${randomBytes(12).toString('hex')}`
let app: INestApplication, base: string, admin: AuthSessionDto, reader: AuthSessionDto, resourceWriter: AuthSessionDto
let image: Buffer, first: any, second: any, hero: any
async function request<T = any>(route: string, token?: string, method = 'GET', input?: unknown) {
  const response = await fetch(`${base}${route}`, {
    method, headers: { ...(input instanceof FormData ? {} : { 'content-type': 'application/json' }), ...(token ? { authorization: `Bearer ${token}` } : {}) },
    ...(input === undefined ? {} : { body: input instanceof FormData ? input : JSON.stringify(input) }),
  })
  const body = await response.json()
  return { status: response.status, data: body.data as T, message: body.message }
}
function uploadInput(buffer: Buffer, filename = 'cover.webp', kind = 'cover') {
  const input = new FormData()
  input.append('file', new Blob([new Uint8Array(buffer)], { type: filename.endsWith('.svg') ? 'image/svg+xml' : 'image/webp' }), filename)
  input.append('name', `${prefix}-${kind}`)
  input.append('kind', kind)
  input.append('altText', '真实媒体隔离测试')
  return input
}
async function restricted(suffix: string, permissions: string[]) {
  const grants = await db.permission.findMany({ where: { code: { in: permissions } } })
  expect(grants.length).toBe(permissions.length)
  const role = await db.role.create({ data: { code: `${prefix}-${suffix}`, name: '媒体隔离权限', permissions: { create: grants.map((item) => ({ permissionId: item.id })) } } })
  const user = await db.user.create({ data: { username: `${prefix}-${suffix}`, email: `${prefix}-${suffix}@example.invalid`, displayName: '隔离账号', passwordHash: await hash(password, 4), userRoles: { create: { roleId: role.id } } } })
  return (await request<AuthSessionDto>('/auth/login', undefined, 'POST', { email: user.email, password })).data
}
beforeAll(async () => {
  await bootstrapDatabase(db)
  app = await NestFactory.create(AppModule, { logger: false })
  app.setGlobalPrefix('api/v1'); app.use(cookieParser())
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.useGlobalFilters(new ApiExceptionFilter()); app.useGlobalInterceptors(new ApiResponseInterceptor(app.get(Reflector)))
  await app.listen(0, '127.0.0.1'); base = `${await app.getUrl()}/api/v1`
  admin = (await request<AuthSessionDto>('/auth/login', undefined, 'POST', { email: process.env.SEED_ADMIN_EMAIL, password: process.env.SEED_ADMIN_PASSWORD })).data
  expect(admin.accessToken).toBeTruthy()
  reader = await restricted('reader', ['media.read'])
  resourceWriter = await restricted('resource-writer', ['resource.read', 'resource.write', 'settings.write'])
  image = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#345678' } }).webp().toBuffer()
  first = (await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(image))).data
  const other = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#876543' } }).webp().toBuffer()
  second = (await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(other))).data
  const banner = await sharp({ create: { width: 128, height: 48, channels: 3, background: '#345689' } }).webp().toBuffer()
  hero = (await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(banner, 'hero.webp', 'hero'))).data
  expect(first.id && second.id && hero.id).toBeTruthy()
}, 30000)
afterAll(async () => { await app?.close(); await db.$disconnect() })

describe('MEDIA-001 真实PostgreSQL权限、版本与文件边界', () => {
  it('未认证、资源编辑者、仅媒体读者权限相互隔离', async () => {
    expect((await request('/admin/media-assets')).status).toBe(401)
    expect((await request('/admin/media-assets', resourceWriter.accessToken)).status).toBe(403)
    expect((await request('/admin/media-assets', reader.accessToken)).status).toBe(200)
    expect((await request('/admin/media-assets/upload', reader.accessToken, 'POST', uploadInput(image))).status).toBe(403)
    expect((await request(`/admin/media-assets/${second.id}`, reader.accessToken, 'DELETE')).status).toBe(403)
    expect((await request('/admin/media-defaults/course/no-grant', reader.accessToken, 'PUT', { assetId: first.id })).status).toBe(403)
    expect((await request('/admin/settings', resourceWriter.accessToken, 'PATCH', { key: 'public_page_visuals', value: {}, expectedRevision: 0 })).status).toBe(400)
  })
  it('公共URL稳定可解码，管理预览仍需认证且不泄漏存储键', async () => {
    expect(first.publicUrl).toBe(`/api/v1/public/media/${first.id}`)
    const response = await fetch(`${base}/public/media/${first.id}`)
    expect(response.status).toBe(200)
    expect(response.headers.get('x-content-type-options')).toBe('nosniff')
    expect((await sharp(Buffer.from(await response.arrayBuffer())).metadata()).width).toBe(64)
    expect((await fetch(`${base}/admin/media-assets/${first.id}/preview`)).status).toBe(401)
    expect((await fetch(`${base}/admin/media-assets/${first.id}/preview`, { headers: { authorization: `Bearer ${reader.accessToken}` } })).status).toBe(200)
    expect(JSON.stringify(first)).not.toMatch(/objectKey|storageDriver|X-Amz|signature=/)
  })
  it('并发相同checksum上传只创建一条资产和公共文件', async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(image))))
    expect(results.every((result) => result.status === 201 && result.data.id === first.id)).toBe(true)
    expect(await db.mediaAsset.count({ where: { fileId: first.fileId } })).toBe(1)
    expect(await db.fileRecord.count({ where: { checksum: first.file.checksum, visibility: 'public', objectKey: { startsWith: 'catalog/' } } })).toBe(1)
  })
  it('相同私有文件不复用或提升可见性，稳定公共端点拒绝私有资产', async () => {
    const storage = app.get<StorageService>(STORAGE_SERVICE)
    const privateFile = await storage.upload({ originalname: 'private.webp', mimetype: 'image/webp', size: image.length, buffer: image }, { uploadedBy: admin.user.id, visibility: 'private' })
    expect(privateFile.id).not.toBe(first.fileId)
    expect((await db.fileRecord.findUniqueOrThrow({ where: { id: privateFile.id } })).visibility).toBe('private')
    const invalid = await db.mediaAsset.create({ data: { assetKey: `${prefix}-private`, fileId: privateFile.id, name: '私有边界探针', kind: 'cover', width: 64, height: 48, createdBy: admin.user.id } })
    expect((await fetch(`${base}/public/media/${invalid.id}`)).status).toBe(404)
    expect((await request('/admin/courses', admin.accessToken, 'POST', { slug: `${prefix}-private`, title: '私有资产绑定', summary: '必须拒绝', coverAssetId: invalid.id })).status).toBe(400)
  })
  it.each([
    '<script>alert(1)</script>', '<image href="https://evil.invalid"/>', '<foreignObject/>',
    '<path onload="alert(1)"/>', '<use href="#x"/>', '<style/>',
  ])('真实上传拒绝恶意SVG %s', async (body) => {
    expect((await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(Buffer.from(`<svg viewBox="0 0 24 24">${body}</svg>`), 'bad.svg'))).status).toBe(400)
  })
  it('完整静态SVG可由受信管理员上传，截断位图拒绝且不新增记录', async () => {
    const clean = Buffer.from('<svg viewBox="0 0 24 24"><path d="M4 12h16" stroke="#123"/></svg>')
    expect((await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(clean, 'clean.svg'))).status).toBe(201)
    const count = await db.mediaAsset.count()
    expect((await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(image.subarray(0, image.length - 10)))).status).toBe(400)
    expect(await db.mediaAsset.count()).toBe(count)
  })
  it('真实multipart拒绝错MIME、超过5MB、超宽与超像素图片', async () => {
    const count = await db.mediaAsset.count()
    const wrongMime = uploadInput(image)
    wrongMime.set('file', new Blob([new Uint8Array(image)], { type: 'image/png' }), 'wrong.webp')
    expect((await request('/admin/media-assets/upload', admin.accessToken, 'POST', wrongMime)).status).toBe(400)
    expect((await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(Buffer.alloc(5 * 1024 * 1024 + 1)))).status).toBe(413)
    for (const [width, height] of [[8193, 16], [6000, 6000]]) {
      const oversized = await sharp({ create: { width, height, channels: 3, background: '#c8c8c8' } }).webp().toBuffer()
      expect((await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(oversized))).status).toBe(400)
    }
    expect(await db.mediaAsset.count()).toBe(count)
  }, 30000)
  const kinds = [
    ['theme', 'themes', {}], ['course', 'courses', {}], ['lab', 'labs', { labType: 'agent' }],
    ['resource', 'resources', { category: 'dataset', format: 'web', visibility: 'public' }],
    ['article', 'articles', { category: 'ai' }], ['challenge', 'challenges', { challengeType: 'quiz', targetScore: 60, rewardPoints: 5 }],
  ] as const
  it.each(kinds)('%s数据库封面外键拒绝不存在素材且事务回滚', async (type, route, fields) => {
    const created = (await request(`/admin/${route}`, admin.accessToken, 'POST', { slug: `${prefix}-fk-${type}`, title: '外键事务保护', summary: '无效素材不得残留', ...fields, coverAssetId: second.id })).data
    const model = type
    await expect((db[model] as any).update({ where: { id: created.databaseId }, data: { coverAssetId: `${prefix}-not-exists` } })).rejects.toMatchObject({ code: 'P2003' })
    expect((await (db[model] as any).findUniqueOrThrow({ where: { id: created.databaseId } })).coverAssetId).toBe(second.id)
  })
  it('媒体文件与默认规则外键拒绝悬空引用及直接删除被引用文件', async () => {
    await expect(db.fileRecord.delete({ where: { id: second.fileId } })).rejects.toMatchObject({ code: 'P2003' })
    await expect(db.mediaDefaultRule.create({ data: { contentType: 'course', categoryKey: `${prefix}-invalid`, assetId: `${prefix}-missing` } })).rejects.toMatchObject({ code: 'P2003' })
    await expect(db.mediaAsset.create({ data: { assetKey: `${prefix}-invalid-file`, fileId: `${prefix}-missing`, name: '外键负例', kind: 'cover', width: 64, height: 48, createdBy: admin.user.id } })).rejects.toMatchObject({ code: 'P2003' })
    expect(await db.fileRecord.count({ where: { id: second.fileId } })).toBe(1)
  })
  it('真实PG逐级验证显式、分类、类型、全局默认链并回滚测试规则', async () => {
    const defaults = await db.mediaAsset.findMany({ where: { kind: 'cover', status: 'active', deletedAt: null, file: { visibility: 'public' } }, orderBy: { id: 'asc' }, take: 3 })
    expect(defaults).toHaveLength(3)
    const resolver = app.get(MediaResolverService)
    await expect(db.$transaction(async (tx) => {
      const put = (contentType: 'course' | 'global', categoryKey: string, assetId: string) => tx.mediaDefaultRule.upsert({ where: { contentType_categoryKey: { contentType, categoryKey } }, create: { contentType, categoryKey, assetId }, update: { assetId, active: true } })
      await put('course', prefix, defaults[0].id); await put('course', 'generic', defaults[1].id); await put('global', 'generic', defaults[2].id)
      const input = { contentType: 'course' as const, categoryKey: prefix }
      expect(await resolver.resolve({ ...input, explicitAssetId: second.id }, tx)).toMatchObject({ id: second.id, source: 'explicit' })
      expect(await resolver.resolve(input, tx)).toMatchObject({ id: defaults[0].id, source: 'category_default' })
      await tx.mediaDefaultRule.delete({ where: { contentType_categoryKey: { contentType: 'course', categoryKey: prefix } } })
      expect(await resolver.resolve(input, tx)).toMatchObject({ id: defaults[1].id, source: 'type_default' })
      await tx.mediaDefaultRule.delete({ where: { contentType_categoryKey: { contentType: 'course', categoryKey: 'generic' } } })
      expect(await resolver.resolve(input, tx)).toMatchObject({ id: defaults[2].id, source: 'global_default' })
      await tx.mediaDefaultRule.delete({ where: { contentType_categoryKey: { contentType: 'global', categoryKey: 'generic' } } })
      expect(await resolver.resolve(input, tx)).toBeNull()
      throw new Error('回滚默认链测试规则')
    })).rejects.toThrow('回滚默认链测试规则')
  })
  it.each(kinds)('%s封面编辑只改草稿，发布后生效，移除回退，删除保留媒体和历史', async (type, route, fields) => {
    const slug = `${prefix}-${type}`
    const created = await request(`/admin/${route}`, admin.accessToken, 'POST', { slug, title: `${type}封面版本`, summary: '真实版本隔离测试', ...fields, coverAssetId: first.id })
    expect(created.status).toBe(201)
    const id = created.data.databaseId
    expect((await request(`/admin/${route}/${id}/publish`, admin.accessToken, 'POST')).status).toBe(201)
    expect((await request(`/${route}/${slug}`)).data.data.coverAssetId).toBe(first.id)
    expect((await request(`/admin/${route}/${id}`, admin.accessToken, 'PATCH', { coverAssetId: second.id })).status).toBe(200)
    expect((await request(`/admin/${route}/${id}`, admin.accessToken)).data.data.coverAssetId).toBe(second.id)
    expect((await request(`/${route}/${slug}`)).data.data.coverAssetId).toBe(first.id)
    expect((await request(`/admin/${route}/${id}/publish`, admin.accessToken, 'POST')).status).toBe(201)
    expect((await request(`/${route}/${slug}`)).data.data.coverAssetId).toBe(second.id)
    expect((await request(`/admin/${route}/${id}`, admin.accessToken, 'PATCH', { coverAssetId: null })).status).toBe(200)
    expect((await request(`/${route}/${slug}`)).data.data.coverAssetId).toBe(second.id)
    await request(`/admin/${route}/${id}/publish`, admin.accessToken, 'POST')
    const removed = (await request(`/${route}/${slug}`)).data.data
    expect(removed.coverAssetId).toBeNull()
    expect(removed.coverSource).not.toBe('explicit')
    expect(removed.cover).toMatch(/^\/api\/v1\/public\/media\//)
    expect((await request(`/admin/media-assets/${first.id}`, admin.accessToken, 'DELETE')).status).toBe(400)
    expect((await request(`/admin/${route}/${id}`, admin.accessToken, 'DELETE')).status).toBe(200)
    expect((await request(`/${route}/${slug}`)).status).toBe(404)
    expect(await db.mediaAsset.count({ where: { id: { in: [first.id, second.id] } } })).toBe(2)
    expect((await request(`/admin/${route}/${id}/publish`, admin.accessToken, 'POST')).status).toBe(404)
  })
  it('默认规则修订并发只允许一位写者，默认资产禁止归档和删除', async () => {
    const route = `/admin/media-defaults/course/${prefix}`
    const initial = await request(route, admin.accessToken, 'PUT', { assetId: first.id })
    expect(initial.status).toBe(200)
    const results = await Promise.all([first.id, second.id].map((assetId) => request(route, admin.accessToken, 'PUT', { assetId, expectedRevision: initial.data.revision })))
    expect(results.map((item) => item.status).sort()).toEqual([200, 409])
    const rule = await db.mediaDefaultRule.findUniqueOrThrow({ where: { contentType_categoryKey: { contentType: 'course', categoryKey: prefix } } })
    const asset = await db.mediaAsset.findUniqueOrThrow({ where: { id: rule.assetId } })
    expect((await request(`/admin/media-assets/${asset.id}`, admin.accessToken, 'PATCH', { expectedRevision: asset.revision, status: 'archived' })).status).toBe(400)
    expect((await request(`/admin/media-assets/${asset.id}`, admin.accessToken, 'DELETE')).status).toBe(400)
    await db.mediaDefaultRule.delete({ where: { id: rule.id } })
  })
  it('Hero只接受白名单字段和hero用途，公共响应不透传设置', async () => {
    const before = (await request('/admin/page-visuals', admin.accessToken)).data
    expect((await request('/admin/page-visuals', admin.accessToken, 'PUT', { expectedRevision: before.revision, value: { secretKey: 'no' } })).status).toBe(400)
    expect((await request('/admin/page-visuals', admin.accessToken, 'PUT', { expectedRevision: before.revision, value: { topicsHeroAssetId: first.id } })).status).toBe(400)
    expect((await request('/admin/page-visuals', admin.accessToken, 'PUT', { expectedRevision: before.revision, value: { ...before.value, topicsHeroAssetId: hero.id } })).status).toBe(200)
    const publicVisuals = (await request('/public/page-visuals')).data
    expect(publicVisuals.heroes.topicsHeroAssetId.url).toBe(hero.publicUrl)
    expect(Object.keys(publicVisuals.heroes)).toHaveLength(6)
    const current = (await request('/admin/page-visuals', admin.accessToken)).data
    await request('/admin/page-visuals', admin.accessToken, 'PUT', { expectedRevision: current.revision, value: before.value })
  })
  it('onlyUnused使用同一全历史引用语义；归档封面即时默认回退且可认证预览', async () => {
    const unused = (await request(`/admin/media-assets?onlyUnused=true&keyword=${prefix}`, admin.accessToken)).data
    expect(unused.items.some((row: any) => row.id === first.id || row.id === second.id)).toBe(false)
    const current = await db.mediaAsset.findUniqueOrThrow({ where: { id: first.id } })
    expect((await request(`/admin/media-assets/${first.id}`, admin.accessToken, 'PATCH', { expectedRevision: current.revision, status: 'archived' })).status).toBe(200)
    expect((await fetch(`${base}/public/media/${first.id}`)).status).toBe(404)
    expect((await fetch(`${base}/admin/media-assets/${first.id}/preview`, { headers: { authorization: `Bearer ${reader.accessToken}` } })).status).toBe(200)
    expect((await app.get(MediaResolverService).resolve({ contentType: 'course', explicitAssetId: first.id }))?.source).not.toBe('explicit')
  })
  it('资源附件fileId与封面替换、移除、版本恢复完全独立', async () => {
    const storage = app.get<StorageService>(STORAGE_SERVICE), content = Buffer.from('media attachment test')
    const file = await storage.upload({ originalname: 'resource.txt', mimetype: 'text/plain', size: content.length, buffer: content }, { uploadedBy: admin.user.id, visibility: 'private' })
    const created = (await request('/admin/resources', admin.accessToken, 'POST', { slug: `${prefix}-attachment`, title: '附件与封面分离', summary: '资源历史附件保护', category: 'dataset', format: 'txt', visibility: 'public', fileId: file.id, coverAssetId: second.id })).data
    const id = created.databaseId
    await request(`/admin/resources/${id}/publish`, admin.accessToken, 'POST')
    const row = await db.resource.findUniqueOrThrow({ where: { id } })
    await request(`/admin/resources/${id}`, admin.accessToken, 'PATCH', { coverAssetId: null })
    expect((await db.resource.findUniqueOrThrow({ where: { id } })).fileId).toBe(file.id)
    expect((await request(`/admin/resources/${id}/versions/${row.publishedVersionId}/restore`, admin.accessToken, 'POST')).status).toBe(201)
    expect((await db.resource.findUniqueOrThrow({ where: { id } })).coverAssetId).toBe(second.id)
    const replacement = Buffer.from('independent replacement attachment')
    const other = await storage.upload({ originalname: 'replacement.txt', mimetype: 'text/plain', size: replacement.length, buffer: replacement }, { uploadedBy: admin.user.id, visibility: 'private' })
    expect((await request(`/admin/resources/${id}`, admin.accessToken, 'PATCH', { fileId: other.id })).status).toBe(200)
    const replaced = await db.resource.findUniqueOrThrow({ where: { id } })
    expect(replaced.fileId).toBe(other.id); expect(replaced.coverAssetId).toBe(second.id)
    await expect(storage.delete(file.id)).rejects.toThrow('引用')
  })
  it('普通学习者真实下载发布附件A，不能越过快照读取草稿B', async () => {
    const storage = app.get<StorageService>(STORAGE_SERVICE)
    const contentA = Buffer.from(`${prefix}-published-attachment-A`), contentB = Buffer.from(`${prefix}-draft-attachment-B`)
    const put = (content: Buffer, name: string) => storage.upload({ originalname: name, mimetype: 'text/plain', size: content.length, buffer: content }, { uploadedBy: admin.user.id, visibility: 'private' })
    const [a, b] = await Promise.all([put(contentA, 'published-A.txt'), put(contentB, 'draft-B.txt')])
    const sha = (content: Buffer) => createHash('sha256').update(content).digest('hex')
    const download = async (id: string, expected?: Buffer) => {
      const response = await fetch(`${base}/files/${id}/download`, { headers: { authorization: `Bearer ${reader.accessToken}` } })
      expect(response.status).toBe(expected ? 200 : 404)
      if (expected) expect(sha(Buffer.from(await response.arrayBuffer()))).toBe(sha(expected))
    }
    const created = (await request('/admin/resources', admin.accessToken, 'POST', { slug: `${prefix}-snapshot-download`, title: '发布附件隔离', summary: '真实字节与权限切换', category: 'dataset', format: 'txt', visibility: 'public', fileId: a.id, coverAssetId: second.id })).data
    const route = `/admin/resources/${created.databaseId}`
    expect((await request(`${route}/publish`, admin.accessToken, 'POST')).status).toBe(201)
    await download(a.id, contentA); await download(b.id)
    expect((await request(route, admin.accessToken, 'PATCH', { fileId: b.id, visibility: 'private', coverAssetId: null })).status).toBe(200)
    const published = (await request(`/resources/${created.slug}`)).data
    expect(published.file.id).toBe(a.id)
    await download(a.id, contentA); await download(b.id)
    expect((await db.resource.findUniqueOrThrow({ where: { id: created.databaseId } })).downloadCount).toBe(2)
    expect((await request(route, admin.accessToken, 'PATCH', { fileId: null })).status).toBe(200)
    await download(a.id, contentA); await download(b.id)
    expect((await request(`${route}/publish`, admin.accessToken, 'POST')).status).toBe(201)
    await download(a.id); await download(b.id)
    expect((await request(route, admin.accessToken, 'PATCH', { fileId: b.id, visibility: 'private' })).status).toBe(200)
    expect((await request(`${route}/publish`, admin.accessToken, 'POST')).status).toBe(201)
    await download(a.id); await download(b.id)
    expect((await request(route, admin.accessToken, 'PATCH', { fileId: b.id, visibility: 'public' })).status).toBe(200)
    expect((await request(`${route}/publish`, admin.accessToken, 'POST')).status).toBe(201)
    await download(a.id); await download(b.id, contentB)
    const resource = await db.resource.findUniqueOrThrow({ where: { id: created.databaseId } })
    const version = await db.resourceVersion.findUniqueOrThrow({ where: { id: resource.publishedVersionId! } })
    const legacy = { ...(version.snapshot as Record<string, any>) }; delete legacy.fileId
    await db.resourceVersion.update({ where: { id: version.id }, data: { snapshot: legacy } })
    await download(b.id)
    expect((await request(`/resources/${created.slug}`)).data.file).toBeNull()
  })
  it.each(kinds.filter(([type]) => type !== 'theme'))('%s演示内容删除后bootstrap两次不复活，显式恢复不重写版本', async (type, route, fields) => {
    const model = db[type] as any, versionsModel = db[`${type}Version`] as any
    const created = (await request(`/admin/${route}`, admin.accessToken, 'POST', { slug: `${prefix}-demo-${type}`, title: '可删除演示内容', summary: '普通数据库记录', ...fields, coverAssetId: second.id })).data
    const row = await model.update({ where: { id: created.databaseId }, data: { dataOrigin: 'demo_seed' } })
    expect((await request(`/admin/${route}?dataOrigin=demo_seed&keyword=${prefix}-demo`, admin.accessToken)).data.items.some((item: any) => item.databaseId === row.id)).toBe(true)
    const sentinel = (await request(`/admin/${route}`, admin.accessToken, 'POST', { slug: `${prefix}-sentinel-${type}`, title: '人工哨兵', summary: '不可被演示恢复重写', ...fields, coverAssetId: second.id })).data
    const beforeSentinel = await model.findUniqueOrThrow({ where: { id: sentinel.databaseId } })
    await request(`/admin/${route}/${row.id}/publish`, admin.accessToken, 'POST')
    const versions = await versionsModel.findMany({ where: { [`${type}Id`]: row.id } })
    await request(`/admin/${route}/${row.id}`, admin.accessToken, 'DELETE')
    await bootstrapDatabase(db); await bootstrapDatabase(db)
    expect((await request(`/${route}/${row.slug}`)).status).toBe(404)
    expect((await model.findUniqueOrThrow({ where: { id: row.id } })).deletedAt).not.toBeNull()
    await changeDemoContent(db, 'restore')
    expect((await request(`/${route}/${row.slug}`)).status).toBe(200)
    expect(await versionsModel.findMany({ where: { [`${type}Id`]: row.id } })).toEqual(versions)
    expect(await model.findUniqueOrThrow({ where: { id: sentinel.databaseId } })).toEqual(beforeSentinel)
  })
  it('归档孤立素材保留30天，GC删除文件记录和对象；历史引用永远阻止GC', async () => {
    const buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#913472' } }).webp().toBuffer()
    const asset = (await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(buffer))).data
    const storage = app.get<StorageService>(STORAGE_SERVICE)
    const file = await db.fileRecord.findUniqueOrThrow({ where: { id: asset.fileId } })
    expect(file.storageDriver).toBe('local')
    const storageRoot = path.resolve(process.env.STORAGE_LOCAL_PATH || './var/uploads'), objectPath = path.resolve(storageRoot, file.objectKey)
    expect(objectPath.startsWith(`${storageRoot}${path.sep}`)).toBe(true)
    expect(createHash('sha256').update(await readFile(objectPath)).digest('hex')).toBe(file.checksum)
    await db.mediaAsset.update({ where: { id: asset.id }, data: { status: 'archived', updatedAt: new Date(Date.now() - 31 * 86400000) } })
    await db.mediaAsset.update({ where: { id: first.id }, data: { updatedAt: new Date(Date.now() - 31 * 86400000) } })
    const preview = await collectArchivedMedia(db, storage)
    expect(preview.eligible).toContain(asset.assetKey)
    expect(preview.eligible).not.toContain(first.assetKey)
    expect(await storage.exists(asset.fileId)).toBe(true)
    const applied = await collectArchivedMedia(db, storage, true)
    expect(applied.pending).toEqual([])
    expect(await db.mediaAsset.count({ where: { id: asset.id } })).toBe(0)
    expect(await db.fileRecord.count({ where: { id: asset.fileId } })).toBe(0)
    expect(await storage.exists(asset.fileId)).toBe(false)
    await expect(access(objectPath)).rejects.toMatchObject({ code: 'ENOENT' })
    expect(await db.mediaAsset.count({ where: { id: first.id } })).toBe(1)
  })
  it('近期孤立、默认规则、页面设置和共享历史引用均保留', async () => {
    const make = async (color: string) => (await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(await sharp({ create: { width: 32, height: 24, channels: 3, background: color } }).webp().toBuffer()))).data
    const recent = await make('#143526'), defaultAsset = await make('#632781')
    await db.mediaAsset.update({ where: { id: recent.id }, data: { status: 'archived' } })
    const rule = (await request(`/admin/media-defaults/course/${prefix}-gc`, admin.accessToken, 'PUT', { assetId: defaultAsset.id })).data
    const setting = (await request('/admin/page-visuals', admin.accessToken)).data
    expect((await request('/admin/page-visuals', admin.accessToken, 'PUT', { expectedRevision: setting.revision, value: { ...setting.value, topicsHeroAssetId: hero.id } })).status).toBe(200)
    // 模拟历史或并发遗留的归档状态，真实引用检查仍必须阻止GC。
    await db.mediaAsset.updateMany({ where: { id: { in: [defaultAsset.id, hero.id] } }, data: { status: 'archived', updatedAt: new Date(Date.now() - 31 * 86400000) } })
    const shared = await Promise.all(['one', 'two'].map(async (suffix) => {
      const row = (await request('/admin/courses', admin.accessToken, 'POST', { slug: `${prefix}-shared-${suffix}`, title: '共享素材内容', summary: '删除内容不级联素材', coverAssetId: second.id })).data
      await request(`/admin/courses/${row.databaseId}/publish`, admin.accessToken, 'POST')
      return row
    }))
    await request(`/admin/courses/${shared[0].databaseId}`, admin.accessToken, 'DELETE')
    expect((await request(`/courses/${shared[1].slug}`)).data.data.coverAssetId).toBe(second.id)
    expect((await fetch(`${base}/public/media/${second.id}`)).status).toBe(200)
    const preview = await collectArchivedMedia(db, app.get<StorageService>(STORAGE_SERVICE))
    for (const asset of [recent, defaultAsset, hero, first]) expect(preview.eligible).not.toContain(asset.assetKey)
    for (const asset of [recent, defaultAsset, hero, first, second]) expect(await db.mediaAsset.count({ where: { id: asset.id } })).toBe(1)
    await db.mediaAsset.updateMany({ where: { id: { in: [defaultAsset.id, hero.id] } }, data: { status: 'active' } })
    const current = (await request('/admin/page-visuals', admin.accessToken)).data
    await request('/admin/page-visuals', admin.accessToken, 'PUT', { expectedRevision: current.revision, value: setting.value })
    await db.mediaDefaultRule.delete({ where: { id: rule.id } })
  })
  it('Storage删除故障注入保留真实PG清理队列，重试后对象实体才消失', async () => {
    const storage = app.get<StorageService>(STORAGE_SERVICE)
    const bytes = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#318976' } }).webp().toBuffer()
    const asset = (await request('/admin/media-assets/upload', admin.accessToken, 'POST', uploadInput(bytes))).data
    const file = await db.fileRecord.findUniqueOrThrow({ where: { id: asset.fileId } })
    const storageRoot = path.resolve(process.env.STORAGE_LOCAL_PATH || './var/uploads'), objectPath = path.resolve(storageRoot, file.objectKey)
    expect(objectPath.startsWith(`${storageRoot}${path.sep}`)).toBe(true)
    await db.mediaAsset.update({ where: { id: asset.id }, data: { status: 'archived', updatedAt: new Date(Date.now() - 31 * 86400000) } })
    const failing = { delete: async () => { throw new Error('受控Storage删除故障注入') } } as unknown as StorageService
    const failed = await collectArchivedMedia(db, failing, true)
    expect(failed.pending.length).toBeGreaterThan(0)
    expect(await db.mediaGcJob.count({ where: { fileId: asset.fileId } })).toBe(1)
    expect(await db.fileRecord.count({ where: { id: asset.fileId } })).toBe(1)
    await expect(access(objectPath)).resolves.toBeUndefined()
    const retried = await collectArchivedMedia(db, storage, true)
    expect(retried.pending).toEqual([])
    expect(await db.mediaGcJob.count({ where: { fileId: asset.fileId } })).toBe(0)
    expect(await db.fileRecord.count({ where: { id: asset.fileId } })).toBe(0)
    await expect(access(objectPath)).rejects.toMatchObject({ code: 'ENOENT' })
  })
  it('社区引用使用发布封面，删除内容后不回退到固定演示数组', async () => {
    const created = (await request('/admin/courses', admin.accessToken, 'POST', { slug: `${prefix}-binding`, title: '社区共享封面', summary: '发布快照', coverAssetId: second.id })).data
    await request(`/admin/courses/${created.databaseId}/publish`, admin.accessToken, 'POST')
    const service = app.get(ContentReferenceService)
    const input = [{ type: 'course', id: created.databaseId }] as Parameters<ContentReferenceService['resolveMany']>[0]
    const result = await service.resolveMany(input, admin.user.id)
    expect(result.get(`course:${created.databaseId}`)?.cover).toBe(second.publicUrl)
    await request(`/admin/courses/${created.databaseId}`, admin.accessToken, 'DELETE')
    expect((await service.resolveMany(input, admin.user.id)).has(`course:${created.databaseId}`)).toBe(false)
  })
  it('实训步骤/工具/关联与并发发布不改旧发布快照，也不跨实训修改步骤', async () => {
    const create = async (suffix: string) => (await request('/admin/labs', admin.accessToken, 'POST', { slug: `${prefix}-structure-${suffix}`, title: '实训结构版本', summary: '发布并发隔离', labType: 'agent', coverAssetId: second.id })).data.databaseId as string
    const id = await create('a'), other = await create('b')
    const step = (await request(`/admin/labs/${id}/steps`, admin.accessToken, 'POST', { stepKey: 'first', title: '最初步骤', description: '版本化说明' })).data
    await request(`/admin/labs/${id}/publish`, admin.accessToken, 'POST')
    const published = (await db.lab.findUniqueOrThrow({ where: { id }, include: { publishedVersion: true } })).publishedVersion!
    expect((await request(`/admin/labs/${other}/steps/${step.id}`, admin.accessToken, 'PATCH', { title: '禁止跨对象修改' })).status).toBeGreaterThanOrEqual(400)
    expect((await db.labStep.findUniqueOrThrow({ where: { id: step.id } })).title).toBe('最初步骤')
    const operations = [
      request(`/admin/labs/${id}/steps/${step.id}`, admin.accessToken, 'PATCH', { title: '新草稿步骤' }),
      request(`/admin/labs/${id}/tools`, admin.accessToken, 'PUT', { tools: [] }),
      request(`/admin/labs/${id}/resources`, admin.accessToken, 'PUT', { resourceIds: [] }),
      request(`/admin/labs/${id}/publish`, admin.accessToken, 'POST'),
    ]
    expect((await Promise.all(operations)).every((result) => result.status < 300)).toBe(true)
    expect((await db.labVersion.findUniqueOrThrow({ where: { id: published.id } })).snapshot).toEqual(published.snapshot)
  })
  it('课程章节/课时/块首次编辑自动映射草稿ID，旧结构及并发发布快照保持不变', async () => {
    const course = (await request('/admin/courses', admin.accessToken, 'POST', { slug: `${prefix}-structure-course`, title: '课程结构隔离', summary: '真实版本外键', coverAssetId: second.id })).data.databaseId
    const chapter = (await request(`/admin/courses/${course}/chapters`, admin.accessToken, 'POST', { title: '最初章节' })).data
    const lesson = (await request(`/admin/chapters/${chapter.id}/lessons`, admin.accessToken, 'POST', { title: '最初课时' })).data
    const block = (await request(`/admin/lessons/${lesson.id}/blocks`, admin.accessToken, 'POST', { blockType: 'paragraph', content: { text: '原发布正文' } })).data
    await request(`/admin/courses/${course}/publish`, admin.accessToken, 'POST')
    const row = await db.course.findUniqueOrThrow({ where: { id: course }, include: { publishedVersion: true } })
    const edited = await request(`/admin/lesson-blocks/${block.id}`, admin.accessToken, 'PATCH', { content: { text: '仅草稿正文' } })
    expect(edited.status).toBe(200)
    expect(edited.data.id).not.toBe(block.id)
    expect((await db.lessonBlock.findUniqueOrThrow({ where: { id: block.id } })).content).toEqual({ text: '原发布正文' })
    expect((await request(`/admin/course-chapters/${chapter.id}`, admin.accessToken, 'PATCH', { title: '过期结构请求' })).status).toBe(409)
    expect((await Promise.all([
      request(`/admin/courses/${course}/chapters`, admin.accessToken, 'POST', { title: '并发新章节' }),
      request(`/admin/courses/${course}/publish`, admin.accessToken, 'POST'),
    ])).every((result) => result.status === 201)).toBe(true)
    expect(await db.courseChapter.count({ where: { courseVersionId: row.publishedVersionId! } })).toBe(1)
    expect((await db.courseVersion.findUniqueOrThrow({ where: { id: row.publishedVersionId! } })).snapshot).toEqual(row.publishedVersion!.snapshot)
  })
  it('主题路径、挑战题库与文章定时准备并发发布时保留历史快照封面', async () => {
    const theme = (await request('/admin/themes', admin.accessToken, 'POST', { slug: `${prefix}-race-theme`, title: '主题并发版本', summary: '路径与封面隔离', coverAssetId: second.id })).data.databaseId
    const challenge = (await request('/admin/challenges', admin.accessToken, 'POST', { slug: `${prefix}-race-challenge`, title: '挑战并发版本', summary: '关联与封面隔离', challengeType: 'quiz', targetScore: 60, rewardPoints: 5, coverAssetId: second.id })).data.databaseId
    const article = (await request('/admin/articles', admin.accessToken, 'POST', { slug: `${prefix}-race-article`, title: '文章并发版本', summary: '定时与封面隔离', category: 'ai', coverAssetId: second.id })).data.databaseId
    for (const [route, id] of [['themes', theme], ['challenges', challenge], ['articles', article]]) await request(`/admin/${route}/${id}/publish`, admin.accessToken, 'POST')
    const versions = await Promise.all([
      db.theme.findUniqueOrThrow({ where: { id: theme }, include: { publishedVersion: true } }),
      db.challenge.findUniqueOrThrow({ where: { id: challenge }, include: { publishedVersion: true } }),
      db.article.findUniqueOrThrow({ where: { id: article }, include: { publishedVersion: true } }),
    ])
    const bank = await db.questionBank.findFirstOrThrow()
    const results = await Promise.all([
      request(`/admin/themes/${theme}/path`, admin.accessToken, 'PUT', { name: '新草稿路径', stages: [{ stageKey: 'start', name: '新阶段', stageType: 'learning' }] }),
      request(`/admin/themes/${theme}/publish`, admin.accessToken, 'POST'),
      request(`/admin/challenges/${challenge}/question-bank`, admin.accessToken, 'PUT', { questionBankId: bank.id }),
      request(`/admin/challenges/${challenge}/publish`, admin.accessToken, 'POST'),
      request(`/admin/articles/${article}/schedule`, admin.accessToken, 'POST', { scheduledAt: new Date(Date.now() + 86400000).toISOString() }),
      request(`/admin/articles/${article}/publish`, admin.accessToken, 'POST'),
    ])
    expect(results.every((result) => result.status < 300)).toBe(true)
    expect((await db.themeVersion.findUniqueOrThrow({ where: { id: versions[0]!.publishedVersionId! } })).snapshot).toEqual(versions[0]!.publishedVersion!.snapshot)
    expect((await db.challengeVersion.findUniqueOrThrow({ where: { id: versions[1]!.publishedVersionId! } })).snapshot).toEqual(versions[1]!.publishedVersion!.snapshot)
    expect((await db.articleVersion.findUniqueOrThrow({ where: { id: versions[2]!.publishedVersionId! } })).snapshot).toEqual(versions[2]!.publishedVersion!.snapshot)
  })
})
