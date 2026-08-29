import { Module } from '@nestjs/common'
import { ContentSupportModule } from '../../common/content/content-support.module'
import { AuthModule } from '../auth/auth.module'
import { AdminAssessmentController, AdminChallengeController, PublicChallengeController } from './challenge.controller'
import { ChallengeService } from './challenge.service'

@Module({
  imports: [AuthModule, ContentSupportModule],
  controllers: [AdminChallengeController, AdminAssessmentController, PublicChallengeController],
  providers: [ChallengeService],
  exports: [ChallengeService],
})
export class ChallengeModule {}
