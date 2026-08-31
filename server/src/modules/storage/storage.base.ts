import { BadRequestException, NotFoundException } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { PrismaService } from '../../prisma/prisma.service'
import type { StoredFile, UploadedFile, UploadOptions } from './storage.types'
import { StorageService } from './storage.types'
import { fileReferenced, lockFileReferences } from '../../common/persistence'

const allowed = new Map([
  ['.pdf', ['application/pdf']],
  ['.docx', ['application/vnd.openxmlformats-officedocument.wordprocessingml.document']],
  ['.pptx', ['application/vnd.openxmlformats-officedocument.presentationml.presentation']],
  ['.zip', ['application/zip', 'application/x-zip-compressed']],
  ['.txt', ['text/plain']],
  ['.png', ['image/png']],
  ['.jpg', ['image/jpeg']],
  ['.jpeg', ['image/jpeg']],
  ['.webp', ['image/webp']],
])

export abstract class StorageBase extends StorageService {
  constructor(protected readonly prisma: PrismaService, private readonly driver: string) { super() }

  protected abstract putObject(objectKey: string, file: UploadedFile): Promise<void>
  protected abstract removeObject(objectKey: string): Promise<void>
  protected abstract objectExists(objectKey: string): Promise<boolean>
  protected abstract objectUrl(objectKey: string): Promise<string>

  async upload(file: UploadedFile, options: UploadOptions): Promise<StoredFile> {
    if (file.size <= 0 || file.size > 20 * 1024 * 1024) throw new BadRequestException('文件大小必须在 1 字节到 20MB 之间')
    const safeName = path.basename(file.originalname).replace(/[^\p{L}\p{N}._-]/gu, '_')
    const extension = path.extname(safeName).toLowerCase()
    if (!allowed.get(extension)?.includes(file.mimetype)) throw new BadRequestException('文件扩展名或 MIME 类型不允许')
    const b = file.buffer
    const valid = extension === '.png' ? b.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : ['.jpg', '.jpeg'].includes(extension) ? b[0] === 255 && b[1] === 216 && b[2] === 255
      : extension === '.webp' ? b.toString('ascii', 0, 4) === 'RIFF' && b.toString('ascii', 8, 12) === 'WEBP'
      : extension === '.pdf' ? b.toString('ascii', 0, 5) === '%PDF-'
      : ['.zip', '.docx', '.pptx'].includes(extension) ? b[0] === 80 && b[1] === 75 && [3, 5, 7].includes(b[2])
      : !b.includes(0)
    if (!valid || b.length !== file.size) throw new BadRequestException('文件内容与 MIME 或大小不匹配')
    const checksum = createHash('sha256').update(file.buffer).digest('hex')
    const objectKey = `${new Date().toISOString().slice(0, 10)}/${randomUUID()}${extension}`
    await this.putObject(objectKey, file)
    const record = await this.prisma.fileRecord.create({
      data: {
        storageDriver: this.driver,
        objectKey,
        originalName: safeName,
        extension,
        mimeType: file.mimetype,
        size: file.size,
        checksum,
        visibility: options.visibility,
        uploadedBy: options.uploadedBy,
      },
    }).catch(async (error: unknown) => { await this.removeObject(objectKey); throw error })
    return { id: record.id, originalName: record.originalName, mimeType: record.mimeType, size: record.size, checksum: record.checksum }
  }

  async getSignedUrl(fileId: string) {
    const file = await this.prisma.fileRecord.findUnique({ where: { id: fileId } })
    if (!file || file.storageDriver !== this.driver) throw new NotFoundException('文件不存在或存储驱动不可用')
    return this.objectUrl(file.objectKey)
  }

  async delete(fileId: string) {
    await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      const file = await tx.fileRecord.findUnique({ where: { id: fileId } })
      if (!file) return
      if (await fileReferenced(tx, fileId)) throw new BadRequestException('文件仍被业务内容或历史版本引用，不能清理')
      if (file.storageDriver !== this.driver) throw new BadRequestException('文件存储驱动与当前配置不一致')
      await this.removeObject(file.objectKey)
      await tx.fileRecord.delete({ where: { id: fileId } })
    }, { timeout: 20000 })
  }

  async writable() {
    const key = `_health/${randomUUID()}.txt`
    try { await this.putObject(key, { originalname: 'health.txt', mimetype: 'text/plain', size: 2, buffer: Buffer.from('ok') }); await this.removeObject(key); return true }
    catch { return false }
  }

  async exists(fileId: string) {
    const file = await this.prisma.fileRecord.findUnique({ where: { id: fileId } })
    return !!file && file.storageDriver === this.driver && this.objectExists(file.objectKey)
  }
}
