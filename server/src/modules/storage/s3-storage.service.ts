import { DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { GetObjectCommand } from '@aws-sdk/client-s3'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { StorageBase } from './storage.base'
import type { UploadedFile } from './storage.types'

export class S3StorageAdapter extends StorageBase {
  protected readonly client: S3Client
  protected readonly bucket: string

  constructor(prisma: PrismaService, config: ConfigService, driver = 's3') {
    super(prisma, driver)
    this.bucket = config.getOrThrow('STORAGE_BUCKET')
    this.client = new S3Client({
      region: config.get('STORAGE_REGION') || 'us-east-1',
      endpoint: config.get('STORAGE_ENDPOINT') || undefined,
      forcePathStyle: driver === 'minio',
      credentials: {
        accessKeyId: config.getOrThrow('STORAGE_ACCESS_KEY'),
        secretAccessKey: config.getOrThrow('STORAGE_SECRET_KEY'),
      },
    })
  }

  protected async putObject(objectKey: string, file: UploadedFile) {
    await this.client.send(new PutObjectCommand({ Bucket: this.bucket, Key: objectKey, Body: file.buffer, ContentType: file.mimetype }))
  }

  protected async removeObject(objectKey: string) {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: objectKey }))
  }

  protected async objectExists(objectKey: string) {
    try {
      await this.client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: objectKey }))
      return true
    } catch {
      return false
    }
  }

  protected objectUrl(objectKey: string) {
    return getSignedUrl(this.client, new GetObjectCommand({ Bucket: this.bucket, Key: objectKey }), { expiresIn: 300 })
  }
}

export class MinioStorageAdapter extends S3StorageAdapter {
  constructor(prisma: PrismaService, config: ConfigService) {
    super(prisma, config, 'minio')
  }
}
