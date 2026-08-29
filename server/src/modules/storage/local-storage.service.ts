import { Injectable, NotFoundException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { access, mkdir, rm, writeFile } from 'node:fs/promises'
import * as path from 'node:path'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageBase } from './storage.base'
import type { UploadedFile } from './storage.types'

@Injectable()
export class LocalStorageAdapter extends StorageBase {
  private readonly root: string

  constructor(prisma: PrismaService, config: ConfigService) {
    super(prisma, 'local')
    this.root = path.resolve(config.get('STORAGE_LOCAL_PATH') || './var/uploads')
  }

  private target(key: string) {
    const target = path.resolve(this.root, key)
    if (!target.startsWith(`${this.root}${path.sep}`)) throw new Error('非法对象路径')
    return target
  }

  protected async putObject(objectKey: string, file: UploadedFile) {
    const target = this.target(objectKey)
    await mkdir(path.dirname(target), { recursive: true, mode: 0o750 })
    await writeFile(target, file.buffer, { mode: 0o640 })
  }

  protected async removeObject(objectKey: string) {
    await rm(this.target(objectKey), { force: true })
  }

  protected async objectExists(objectKey: string) {
    try {
      await access(this.target(objectKey))
      return true
    } catch {
      return false
    }
  }

  protected async objectUrl(objectKey: string) {
    return `/api/v1/files/local/${encodeURIComponent(objectKey)}`
  }

  async getSignedUrl(fileId: string) {
    const file = await this.prisma.fileRecord.findUnique({ where: { id: fileId } })
    if (!file || file.storageDriver !== 'local') throw new NotFoundException('文件不存在')
    return `/api/v1/files/${encodeURIComponent(file.id)}/download`
  }
}
