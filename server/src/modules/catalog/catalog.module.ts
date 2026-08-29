import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { AdminCatalogController } from './admin.controller'
import { AdminPlatformController } from './admin-platform.controller'
import { CatalogService } from './catalog.service'
import { PublicCatalogController } from './public.controller'

@Module({ imports: [AuthModule], controllers: [AdminPlatformController, PublicCatalogController, AdminCatalogController], providers: [CatalogService], exports: [CatalogService] })
export class CatalogModule {}
