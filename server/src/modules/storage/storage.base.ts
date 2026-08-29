import { BadRequestException, NotFoundException } from '@nestjs/common'
import { createHash, randomUUID } from 'node:crypto'
import * as path from 'node:path'
import { PrismaService } from '../../prisma/prisma.service'
import type { StoredFile, UploadedFile, UploadOptions } from './storage.types'
import { StorageService } from './storage.types'

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
    })
    return { id: record.id, originalName: record.originalName, mimeType: record.mimeType, size: record.size, checksum: record.checksum }
  }

  async getSignedUrl(fileId: string) {
    const file = await this.prisma.fileRecord.findUnique({ where: { id: fileId } })
    if (!file) throw new NotFoundException('文件不存在')
    return this.objectUrl(file.objectKey)
  }

  async delete(fileId: string) {
    const file = await this.prisma.fileRecord.findUnique({ where: { id: fileId } })
    if (!file) return
    await this.removeObject(file.objectKey)
    await this.prisma.fileRecord.delete({ where: { id: fileId } })
  }

  async exists(fileId: string) {
    const file = await this.prisma.fileRecord.findUnique({ where: { id: fileId } })
    return !!file && this.objectExists(file.objectKey)
  }
}
