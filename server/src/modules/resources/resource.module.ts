import { Module } from '@nestjs/common'
import { ContentSupportModule } from '../../common/content/content-support.module'
import { AuthModule } from '../auth/auth.module'
import { AdminResourceController, PublicResourceController } from './resource.controller'
import { ResourceService } from './resource.service'

@Module({
  imports: [AuthModule, ContentSupportModule],
  controllers: [AdminResourceController, PublicResourceController],
  providers: [ResourceService],
  exports: [ResourceService],
})
export class ResourceModule {}
