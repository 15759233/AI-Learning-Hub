import 'reflect-metadata'
import { describe, expect, it, vi } from 'vitest'
import { BadRequestException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { actionEvent, idempotency } from '../src/common/persistence'
import { StorageBase } from '../src/modules/storage/storage.base'
import { PersistenceService } from '../src/modules/persistence/persistence.service'
import type { PrismaService } from '../src/prisma/prisma.service'

describe('持久化原子职责', () => {
  it('规范化幂等请求键顺序、拒绝同键异内容、过期记录可更新', async () => {
    let stored: any = null
    const tx: any = { $queryRaw: vi.fn(), requestIdempotency: { findUnique: vi.fn(async () => stored), upsert: vi.fn(async ({ create }: any) => { stored = create }) } }
    const first = await idempotency(tx, 'user-a', 'post:new', 'retry-key-1', { b: 2, a: 1 })
    await first.complete('post-1')
    expect((await idempotency(tx, 'user-a', 'post:new', 'retry-key-1', { a: 1, b: 2 })).resourceId).toBe('post-1')
    await expect(idempotency(tx, 'user-a', 'post:new', 'retry-key-1', { a: 2 })).rejects.toThrow()
    stored.expiresAt = new Date(0)
    expect((await idempotency(tx, 'user-a', 'post:new', 'retry-key-1', { a: 2 })).resourceId).toBeNull()
    await expect(idempotency(tx, 'user-a', 'post:new', 'bad', {})).rejects.toThrow()
  })
  it('一个行为只写一条既有事件，保留规范事件与实体身份', async () => {
    const tx: any = { activityEvent: { create: vi.fn() } }
    await actionEvent(tx, 'actor', 'student_register', 'user', 'new-user')
    expect(tx.activityEvent.create).toHaveBeenCalledOnce()
    expect(tx.activityEvent.create).toHaveBeenCalledWith({ data: expect.objectContaining({ eventType: 'student_register', actionType: 'user_registered', entityType: 'user', entityId: 'new-user', source: 'student-web', eventKey: expect.any(String) }) })
  })
  it('文件伪装在写入之前被拒绝，数据库写失败清理新增对象', async () => {
    class MemoryStorage extends StorageBase {
      putObject = vi.fn(async () => {})
      removeObject = vi.fn(async () => {})
      objectExists = vi.fn(async () => true)
      objectUrl = vi.fn(async () => '/local')
    }
    const db = { fileRecord: { create: vi.fn().mockRejectedValue(new Error('db write failed')) } } as unknown as PrismaService
    const storage = new MemoryStorage(db, 'local'), options = { uploadedBy: 'owner', visibility: 'private' as const }
    await expect(storage.upload({ originalname: 'fake.png', mimetype: 'image/png', size: 4, buffer: Buffer.from('fake') }, options)).rejects.toThrow()
    expect(storage.putObject).not.toHaveBeenCalled()
    await expect(storage.upload({ originalname: 'safe.txt', mimetype: 'text/plain', size: 4, buffer: Buffer.from('safe') }, options)).rejects.toThrow('db write failed')
    expect(storage.removeObject).toHaveBeenCalledOnce()
  })
  it('GC第一批均引用仍返回稳定续游标，后续孤儿不会饥饿', async () => {
    const early = Array.from({ length: 50 }, (_, i) => ({ id: `reference-${i}`, createdAt: new Date(0) })), orphan = { id: 'orphan', createdAt: new Date(1) }
    const findMany = vi.fn().mockResolvedValueOnce(early).mockResolvedValueOnce([orphan])
    const prisma = { fileRecord: { findMany }, auditLog: { create: vi.fn() } } as unknown as PrismaService
    const storage: any = { delete: vi.fn(async (id: string) => { if (id !== 'orphan') throw new BadRequestException('referenced') }) }
    const service = new PersistenceService(prisma, new ConfigService({ STORAGE_DRIVER: 'local' }), storage)
    const first = await service.maintain('admin', 'unused-files', '验证文件清理游标')
    expect(first).toMatchObject({ count: 0, nextCursor: expect.any(String) })
    const second = await service.maintain('admin', 'unused-files', '验证文件清理游标', 'nextCursor' in first ? first.nextCursor! : undefined)
    expect(second).toMatchObject({ count: 1, nextCursor: null })
    expect(findMany.mock.calls[1][0].where.OR).toEqual([{ createdAt: { gt: new Date(0) } }, { createdAt: new Date(0), id: { gt: 'reference-49' } }])
  })
})
