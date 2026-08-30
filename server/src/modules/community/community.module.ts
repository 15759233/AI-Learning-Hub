import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { StorageModule } from '../storage/storage.module'
import { SignalsModule } from '../signals/signals.module'
import { ContentReferenceModule } from '../../common/content-reference/content-reference.module'
import { CommunityVisibilityModule } from './visibility.module'
import { CommunityController } from './community.controller'
import { CommunityAdminController } from './admin.controller'
import { CommunityPostService } from './post.service'
import { CommunityCommentService } from './comment.service'
import { CommunityInteractionService } from './interaction.service'
import { CommunityNotificationService } from './notification.service'
import { CommunityContextService } from './context.service'
import { LearningFeedPipeline } from '../feed/feed.service'
@Module({
  imports: [AuthModule, StorageModule, SignalsModule, ContentReferenceModule, CommunityVisibilityModule],
  controllers: [CommunityController, CommunityAdminController],
  providers: [CommunityPostService, CommunityCommentService, CommunityInteractionService, CommunityNotificationService, CommunityContextService, LearningFeedPipeline],
})
export class CommunityModule {}
