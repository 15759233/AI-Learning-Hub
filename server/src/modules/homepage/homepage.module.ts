import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { ArticleModule } from '../articles/article.module'
import { ChallengeModule } from '../challenges/challenge.module'
import { CourseModule } from '../courses/course.module'
import { LabModule } from '../labs/lab.module'
import { ResourceModule } from '../resources/resource.module'
import { ThemeModule } from '../themes/theme.module'
import { AdminHomepageController, PublicHomepageController } from './homepage.controller'
import { HomepageService } from './homepage.service'
import { HomepageConfigGuard } from './homepage-config.guard'
import { ContentReferenceModule } from '../../common/content-reference/content-reference.module'

@Module({
  imports: [AuthModule, ThemeModule, CourseModule, LabModule, ResourceModule, ArticleModule, ChallengeModule, ContentReferenceModule],
  controllers: [AdminHomepageController, PublicHomepageController],
  providers: [HomepageService, HomepageConfigGuard],
})
export class HomepageModule {}
