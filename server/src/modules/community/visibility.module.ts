import { Module } from '@nestjs/common'
import { CommunityVisibilityPolicyService } from './visibility.service'
@Module({ providers: [CommunityVisibilityPolicyService], exports: [CommunityVisibilityPolicyService] })
export class CommunityVisibilityModule {}
