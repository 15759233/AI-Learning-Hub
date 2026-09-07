import { Module } from '@nestjs/common'
import { CommunityUploadGuard, CommunityVisibilityPolicyService } from './visibility.service'
import { ContentDetectionService } from './content-detection.service'
import { CommunityNotificationService } from './notification.service'
import { SignalsModule } from '../signals/signals.module'
@Module({ imports: [SignalsModule], providers: [CommunityVisibilityPolicyService, CommunityUploadGuard, ContentDetectionService, CommunityNotificationService], exports: [CommunityVisibilityPolicyService, CommunityUploadGuard, ContentDetectionService, CommunityNotificationService] })
export class CommunityVisibilityModule {}
