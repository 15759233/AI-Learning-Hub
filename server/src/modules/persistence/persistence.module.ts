import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { PersistenceController } from './persistence.controller'
import { PersistenceService } from './persistence.service'
@Module({ imports: [AuthModule, StorageModule], controllers: [PersistenceController], providers: [PersistenceService], exports: [PersistenceService] })
export class PersistenceModule {}
