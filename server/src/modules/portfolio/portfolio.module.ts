import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { CommunityModule } from '../community/community.module'
import { PortfolioController } from './portfolio.controller'
import { PortfolioService } from './portfolio.service'

@Module({
  imports: [AuthModule, CommunityModule],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}