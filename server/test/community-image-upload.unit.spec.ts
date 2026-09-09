import { describe, expect, it, vi } from 'vitest'
import { crc32 } from 'node:zlib'
import sharp from 'sharp'
import { CommunityController } from '../src/modules/community/community.controller'

describe('社区正文图片上传解码边界', () => {
  it('合法文件头但像素损坏、错类型和超大像素均在存储与幂等登记前拒绝', async () => {
    const png = await sharp({ create: { width: 32, height: 24, channels: 4, background: '#ffffff00' } }).png().toBuffer()
    const huge = Buffer.from(png)
    huge.writeUInt32BE(8192, 16); huge.writeUInt32BE(8192, 20); huge.writeUInt32BE(crc32(huge.subarray(12, 29)), 29)
    const storage = { upload: vi.fn() }, prisma = { idempotencyRequest: { create: vi.fn(), findUnique: vi.fn() } }
    for (const [buffer, mime] of [[png.subarray(0, png.length - 8), 'image/png'], [huge, 'image/png'], [png, 'image/jpeg']] as const) {
      await expect(CommunityController.prototype.upload.call({ storage, prisma } as never, { id: 'owner' } as never, { buffer, size: buffer.length, mimetype: mime, originalname: 'image.png' } as Express.Multer.File, 'request-key')).rejects.toThrow()
    }
    expect(storage.upload).not.toHaveBeenCalled(); expect(prisma.idempotencyRequest.create).not.toHaveBeenCalled()
  })
})
