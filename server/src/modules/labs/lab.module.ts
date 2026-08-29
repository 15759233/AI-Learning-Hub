import { Module } from '@nestjs/common'
import { ContentSupportModule } from '../../common/content/content-support.module'
import { AuthModule } from '../auth/auth.module'
import { AdminLabController, AdminLabRunController, PublicLabController } from './lab.controller'
import { LabService } from './lab.service'

@Module({
  imports: [AuthModule, ContentSupportModule],
  controllers: [AdminLabController, AdminLabRunController, PublicLabController],
  providers: [LabService],
  exports: [LabService],
})
export class LabModule {}
