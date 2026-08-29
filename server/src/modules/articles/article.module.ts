import { Module } from '@nestjs/common'
import { ContentSupportModule } from '../../common/content/content-support.module'
import { AuthModule } from '../auth/auth.module'
import { AdminArticleController, PublicArticleController } from './article.controller'
import { ArticleSchedulerService } from './article-scheduler.service'
import { ArticleService } from './article.service'

@Module({
  imports: [AuthModule, ContentSupportModule],
  controllers: [AdminArticleController, PublicArticleController],
  providers: [ArticleService, ArticleSchedulerService],
  exports: [ArticleService],
})
export class ArticleModule {}
