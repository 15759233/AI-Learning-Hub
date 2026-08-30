import { Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthModule } from '../auth/auth.module'
import { LocalStorageAdapter } from './local-storage.service'
import { MinioStorageAdapter, S3StorageAdapter } from './s3-storage.service'
import { LocalFileController, StorageController } from './storage.controller'
import { STORAGE_SERVICE } from './storage.types'
import { CommunityVisibilityModule } from '../community/visibility.module'
import { FileAccessService } from './file-access.service'

@Module({
  imports: [AuthModule, CommunityVisibilityModule],
  controllers: [StorageController, LocalFileController],
  providers: [FileAccessService, {
    provide: STORAGE_SERVICE,
    inject: [PrismaService, ConfigService],
    useFactory: (prisma: PrismaService, config: ConfigService) => {
      const driver = config.get('STORAGE_DRIVER') || 'local'
      if (driver === 's3') return new S3StorageAdapter(prisma, config)
      if (driver === 'minio') return new MinioStorageAdapter(prisma, config)
      return new LocalStorageAdapter(prisma, config)
    },
  }],
  exports: [STORAGE_SERVICE, FileAccessService],
})
export class StorageModule {}
