import { describe, expect, it, vi } from 'vitest'
import sharp from 'sharp'
import { inspectMediaImage, inspectSvg } from '../src/modules/media/image-validation'
import { SettingsService } from '../src/modules/settings/settings.service'
import { MediaResolverService, safeLegacyCover } from '../src/modules/media/media-resolver.service'
import type { PrismaService } from '../src/prisma/prisma.service'
import { validate } from 'class-validator'
import { plainToInstance } from 'class-transformer'
import { MediaQueryDto, MediaUpdateDto } from '../src/modules/media/media.dto'

const asset = (id: string) => ({ id, altText: '正式封面', width: 1200, height: 675, focalX: 0.25, focalY: 0.75, file: { visibility: 'public' } })
const defaultRules = [
  { contentType: 'course', categoryKey: 'llm', asset: asset('category') },
  { contentType: 'course', categoryKey: 'generic', asset: asset('type') },
  { contentType: 'global', categoryKey: 'generic', asset: asset('global') },
]
const setup = (rules = defaultRules) => {
  const prisma = { mediaAsset: { findFirst: vi.fn(async ({ where }) => where.id === 'valid' ? asset('valid') : null), findMany: vi.fn(async () => [asset('valid')]) }, mediaDefaultRule: { findMany: vi.fn(async () => rules) } }
  return { prisma, resolver: new MediaResolverService(prisma as unknown as PrismaService) }
}
describe('媒体解析与边界', () => {
  it.each(['https://example.invalid/a.webp', '/images/a.webp'])('保留无临签有效旧地址 %s', (value) => expect(safeLegacyCover(value)).toBe(value))
  it.each(['javascript:alert(1)', 'data:image/png;base64,a', 'blob:https://x/a', '//external.invalid/a', '/x?token=secret', '/x?X-Amz-Signature=secret', '/x?%74oken=secret', '/x?sig=secret', 'https://x/a?Expires=5', 'https://u:p@x/a', 'https://x/a\\b', '/a\nb'])('拒绝危险或临签旧地址 %s', (value) => expect(safeLegacyCover(value)).toBeNull())
  it('显式素材优先于旧字符串与所有默认封面', async () => {
    const { resolver } = setup()
    expect(await resolver.resolve({ contentType: 'course', categoryKey: 'llm', explicitAssetId: 'valid', allowLegacy: true, legacyCover: '/old.webp' })).toMatchObject({ id: 'valid', source: 'explicit', url: '/api/v1/public/media/valid', focalPoint: { x: 0.25, y: 0.75 } })
  })
  it('归档或无效显式ID走分类默认，不复活legacy', async () => {
    const { resolver } = setup()
    expect(await resolver.resolve({ contentType: 'course', categoryKey: 'llm', explicitAssetId: 'archived', allowLegacy: true, legacyCover: '/old.webp' })).toMatchObject({ id: 'category', source: 'category_default' })
  })
  it('分类不存在依次走类型和全局默认', async () => {
    expect(await setup().resolver.resolve({ contentType: 'course', categoryKey: 'unknown' })).toMatchObject({ id: 'type', source: 'type_default' })
    expect(await setup(defaultRules.slice(2)).resolver.resolve({ contentType: 'course', categoryKey: 'unknown' })).toMatchObject({ id: 'global', source: 'global_default' })
    expect(await setup([]).resolver.resolve({ contentType: 'course' })).toBeNull()
  })
  it('旧快照属性缺失可读legacy，新快照null明确移除', async () => {
    const { resolver } = setup()
    const item = { title: '课程', coverAssetId: 'draft-only' }
    expect(await resolver.data('course', item, { cover: '/old.webp', category: 'llm' }, true)).toMatchObject({ cover: '/old.webp', coverSource: 'legacy' })
    expect(await resolver.data('course', item, { cover: '/old.webp', coverAssetId: null, category: 'llm' }, true)).toMatchObject({ cover: '/api/v1/public/media/category', coverAssetId: null, coverSource: 'category_default' })
  })
  it('公开快照不读取当前草稿显式ID', async () => {
    const { resolver } = setup()
    expect(await resolver.data('course', { coverAssetId: 'valid' }, { coverAssetId: null }, true)).toMatchObject({ coverAssetId: null, coverSource: 'type_default' })
  })
  it('50个内容使用一次显式批量查询和一次默认批量查询', async () => {
    const { resolver, prisma } = setup()
    const rows = Array.from({ length: 50 }, () => ({ payload: { coverAssetId: 'draft' }, publishedVersion: { snapshot: { data: { coverAssetId: 'valid', category: 'llm' } } } }))
    const cache = await resolver.prepare(rows, true)
    const results = await Promise.all(rows.map((row) => resolver.data('course', row, row.publishedVersion.snapshot.data, true, cache)))
    expect(results.every((result) => result.coverSource === 'explicit')).toBe(true)
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ['valid'] }, file: { visibility: 'public' } }) }))
    expect(prisma.mediaDefaultRule.findMany).toHaveBeenCalledTimes(1)
    expect(prisma.mediaAsset.findFirst).not.toHaveBeenCalled()
  })
  it('查询false不被Boolean转换为true，焦点与并发修订严格校验', async () => {
    expect(plainToInstance(MediaQueryDto, { onlyUnused: 'false' }).onlyUnused).toBe(false)
    expect(await validate(plainToInstance(MediaQueryDto, { onlyUnused: 'maybe' }))).not.toHaveLength(0)
    expect(await validate(plainToInstance(MediaUpdateDto, { expectedRevision: 1, focalX: 1.1 }))).not.toHaveLength(0)
    expect(await validate(plainToInstance(MediaUpdateDto, { expectedRevision: 0, focalX: 0.5 }))).not.toHaveLength(0)
  })
  it('后台旧payload缺字段时批量收集关系列，显式null不收集', async () => {
    const { resolver, prisma } = setup()
    await resolver.prepare([{ payload: {}, coverAssetId: 'valid' }, { payload: { coverAssetId: null }, coverAssetId: 'removed' }], false)
    expect(prisma.mediaAsset.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ id: { in: ['valid'] } }) }))
  })
})

describe('媒体上传真实解码与静态SVG', () => {
  it('通用settings.write不得绕过Hero专属权限和引用锁', async () => {
    await expect(new SettingsService({} as never).update({ key: 'public_page_visuals', value: {}, expectedRevision: 0 })).rejects.toThrow('独立媒体权限')
  })
  it.each(['png', 'jpeg', 'webp'] as const)('完整解码合法%s并验证宽高', async (format) => {
    const buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#efefef' } }).toFormat(format).toBuffer()
    expect(await inspectMediaImage({ originalname: `test.${format}`, mimetype: `image/${format}`, size: buffer.length, buffer })).toEqual({ width: 32, height: 24 })
    await expect(inspectMediaImage({ originalname: 'test.png', mimetype: 'image/png', size: buffer.length, buffer: buffer.subarray(0, buffer.length - 8) })).rejects.toThrow()
    await expect(inspectMediaImage({ originalname: `test.${format}`, mimetype: `image/${format}`, size: buffer.length - 10, buffer: buffer.subarray(0, buffer.length - 10) })).rejects.toThrow()
  })
  it('拒绝错MIME、超小尺寸与伪造PNG头', async () => {
    const buffer = await sharp({ create: { width: 32, height: 24, channels: 3, background: '#eee' } }).png().toBuffer()
    await expect(inspectMediaImage({ originalname: 'test.jpg', mimetype: 'image/jpeg', size: buffer.length, buffer })).rejects.toThrow()
    const tiny = await sharp({ create: { width: 1, height: 1, channels: 3, background: '#eee' } }).png().toBuffer()
    await expect(inspectMediaImage({ originalname: 'test.png', mimetype: 'image/png', size: tiny.length, buffer: tiny })).rejects.toThrow()
    const corrupt = Buffer.from(buffer); corrupt.fill(0, 40)
    await expect(inspectMediaImage({ originalname: 'test.png', mimetype: 'image/png', size: corrupt.length, buffer: corrupt })).rejects.toThrow()
  })
  const clean = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M4 12h16" fill="none" stroke="#000" stroke-linecap="round"/></svg>'
  it('可信管理员静态真矢量通过，普通上传者不得借SVG扩权', async () => {
    expect(inspectSvg(Buffer.from(clean))).toEqual({ width: 24, height: 24 })
    const file = { originalname: 'icon.svg', mimetype: 'image/svg+xml', size: Buffer.byteLength(clean), buffer: Buffer.from(clean) }
    await expect(inspectMediaImage(file)).rejects.toThrow('SVG 仅允许受信任管理员上传')
    await expect(inspectMediaImage(file, true)).resolves.toEqual({ width: 24, height: 24 })
  })
  it.each([
    '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]>',
    '<?xml-stylesheet href="https://evil.invalid/x"?>',
    '<script>alert(1)</script>', '<foreignObject/>', '<image href="x"/>', '<use href="#x"/>', '<style/>',
    '<path onload="alert(1)"/>', '<path fill="url(#x)"/>', '<path href="https://evil.invalid"/>',
    '<path d="M0 0">&amp;</path>', '<g><path/></svg>', '<path/><svg viewBox="0 0 24 24"/>',
  ])('拒绝主动内容或非封闭矢量 %s', (body) => {
    expect(() => inspectSvg(Buffer.from(`<svg viewBox="0 0 24 24">${body}</svg>`))).toThrow()
  })
})
