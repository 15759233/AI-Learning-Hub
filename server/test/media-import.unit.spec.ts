import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import sharp from 'sharp'
import { createHash } from 'node:crypto'
import { bindExistingDemoMedia, importCatalogAssets, readCatalogFile } from '../src/modules/media/import-catalog'
import { changeDemoContent } from '../src/modules/media/demo-data'
import { catalogAssets } from '@ai-learning-hub/catalog-assets'

vi.mock('@ai-learning-hub/catalog-assets', async (original) => ({
  ...await original<object>(),
  catalogAssets: [{ assetKey: 'course--unit', contentType: 'course', contentSlug: 'unit', categoryKey: 'generic', kind: 'cover', name: '测试课程', file: 'images/courses/course--unit.webp', width: 32, height: 24, altText: '独立测试封面', focalX: .5, focalY: .5, defaultFor: [{ contentType: 'course', categoryKey: 'generic' }] }],
}))
let root: string, buffer: Buffer
beforeAll(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'catalog-unit-'))
  await mkdir(path.join(root, 'images/courses'), { recursive: true })
  buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#abc' } }).webp().toBuffer()
  await writeFile(path.join(root, 'images/courses/course--unit.webp'), buffer)
})
afterAll(async () => { await rm(root, { recursive: true, force: true }) })
describe('正式媒体导入和演示记录保护', () => {
  it('完整预检尺寸、摘要与真实路径，拒绝父目录符号链接', async () => {
    const asset = catalogAssets[0]!
    expect((await readCatalogFile(asset, root)).checksum).toBe(createHash('sha256').update(buffer).digest('hex'))
    await expect(readCatalogFile({ ...asset, width: 33 }, root)).rejects.toThrow('尺寸')
    await mkdir(path.join(root, 'linked'))
    await symlink(path.join(root, 'images'), path.join(root, 'linked/images'))
    await expect(readCatalogFile(asset, path.join(root, 'linked'))).rejects.toThrow('正式文件')
    await expect(readCatalogFile({ ...asset, file: '../private.webp' }, root)).rejects.toThrow('路径')
  })
  it('相同清单重复导入零文件写入，且不覆盖已有人工默认规则', async () => {
    const media = { id: 'asset1', assetKey: 'course--unit', source: 'image2_seed', fileId: 'file1', file: { checksum: createHash('sha256').update(buffer).digest('hex') } }
    const db = {
      userRole: { count: vi.fn(async () => 1) }, $queryRaw: vi.fn(async () => []),
      mediaAsset: { findUnique: vi.fn(async () => media), count: vi.fn(async () => 1), update: vi.fn(), create: vi.fn() },
      mediaDefaultRule: { findUnique: vi.fn(async () => ({ assetId: 'hand-selected' })), create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
    }
    const storage = { exists: vi.fn(async () => true), upload: vi.fn() }
    for (let n = 0; n < 2; n++) expect(await importCatalogAssets(db as never, storage as never, 'admin', root)).toEqual({ created: 0, updated: 0, rulesCreated: 0, assetIds: { 'course--unit': 'asset1' } })
    expect(storage.upload).not.toHaveBeenCalled()
    expect(db.mediaAsset.update).not.toHaveBeenCalled()
    expect(db.mediaDefaultRule.create).not.toHaveBeenCalled()
  })
  it('私人占用assetKey明确拒绝，不覆盖人工资产', async () => {
    const db = { userRole: { count: vi.fn(async () => 1) }, mediaAsset: { findUnique: vi.fn(async () => ({ source: 'upload' })) } }
    await expect(importCatalogAssets(db as never, {} as never, 'admin', root)).rejects.toThrow('人工资源占用')
  })
  it('导入第二阶段创建失败复用条件补偿，绝不留下不可追踪文件', async () => {
    const db = {
      userRole: { count: vi.fn(async () => 1) }, $queryRaw: vi.fn(async () => []),
      mediaAsset: { findUnique: vi.fn(async () => null), count: vi.fn(async () => 0), create: vi.fn(async () => { throw new Error('asset import failed') }) },
      mediaGcJob: { upsert: vi.fn(async () => ({ id: 'job1' })), delete: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
    }
    const storage = { upload: vi.fn(async () => ({ id: 'newfile' })), delete: vi.fn() }
    await expect(importCatalogAssets(db as never, storage as never, 'admin', root)).rejects.toThrow('asset import failed')
    expect(storage.delete).toHaveBeenCalledWith('newfile')
    expect(db.mediaGcJob.delete).toHaveBeenCalledWith({ where: { id: 'job1' } })
  })
  it('旧记录补封面仅改允许字段，草稿和发布版逐份处理且历史快照不进入查询结果', async () => {
    const data = { title: '草稿不同标题', data: { description: '草稿正文', coverVariant: 'ai' } }
    const published = { title: '已发布标题', data: { description: '发布正文' } }
    const db = {
      mediaAsset: { findUnique: vi.fn(async () => ({ id: 'asset1', status: 'active' })) },
      $queryRaw: vi.fn(async (sql: { sql: string }) => {
        if (sql.sql?.includes('SELECT id,title')) return [{ id: 'c1', title: '测试课程', payload: { description: '现有正文' }, cover_asset_id: null }]
        if (sql.sql?.includes('SELECT v.id')) return [{ id: 'draft', snapshot: data }, { id: 'published', snapshot: published }]
        return []
      }),
      $executeRaw: vi.fn(async (sql: unknown) => Number(Boolean(sql))), auditLog: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
    }
    expect(await bindExistingDemoMedia(db as never, 'admin')).toEqual({ contents: 1, snapshots: 2 })
    const writes = db.$executeRaw.mock.calls.map(([sql]) => sql as unknown as { sql: string; values: unknown[] })
    expect(writes[0]!.sql).not.toMatch(/updated_at|published_version_id|title=/)
    const versions = writes.slice(1).map((sql) => JSON.parse(String(sql.values[0])))
    expect(versions).toEqual([{ ...data, data: { ...data.data, coverAssetId: 'asset1' } }, { ...published, data: { ...published.data, coverAssetId: 'asset1' } }])
    expect(db.$queryRaw.mock.calls.some(([sql]) => sql.sql?.includes('v.id IN (c.current_draft_version_id,c.published_version_id)'))).toBe(true)
  })
  it.each([{ cover: '/legacy.webp' }, { coverAssetId: null }, { coverAssetId: 'manual' }])('有效旧cover、显式移除和人工ID均不升级 %j', async (payload) => {
    const db = {
      mediaAsset: { findUnique: vi.fn(async () => ({ id: 'asset1', status: 'active' })) },
      $queryRaw: vi.fn(async (sql: { sql: string }) => sql.sql?.includes('SELECT id,title') ? [{ id: 'c1', title: '测试课程', payload, cover_asset_id: null }] : sql.sql?.includes('SELECT v.id') ? [{ id: 'published', snapshot: { data: payload } }] : []),
      $executeRaw: vi.fn(), auditLog: { create: vi.fn() },
      $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)),
    }
    expect(await bindExistingDemoMedia(db as never, 'admin')).toEqual({ contents: 0, snapshots: 0 })
    expect(db.$executeRaw).not.toHaveBeenCalled()
  })
  it('演示清理默认dry-run；显式清理和恢复均只处理data_origin=demo_seed、不删除媒体或历史', async () => {
    const db = { user: { findFirst: vi.fn(async () => ({ id: 'admin' })) }, $queryRaw: vi.fn(async () => [{ id: 'demo1' }]), $executeRaw: vi.fn(), auditLog: { create: vi.fn() }, $transaction: vi.fn(async (fn: (tx: unknown) => unknown) => fn(db)) }
    expect((await changeDemoContent(db as never)).mode).toBe('preview')
    expect(db.$executeRaw).not.toHaveBeenCalled()
    await changeDemoContent(db as never, 'delete')
    await changeDemoContent(db as never, 'restore')
    for (const [sql] of db.$executeRaw.mock.calls) {
      const text = (sql as { sql: string }).sql
      expect(text).toContain("WHERE data_origin='demo_seed'")
      expect(text).not.toMatch(/DELETE FROM|media_assets|file_records|_versions SET|payload=/)
    }
  })
})
