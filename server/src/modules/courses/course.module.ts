import { Module } from '@nestjs/common'
import { ContentSupportModule } from '../../common/content/content-support.module'
import { AuthModule } from '../auth/auth.module'
import { AdminCourseController, CourseStructureController, PublicCourseController } from './course.controller'
import { CourseService } from './course.service'

@Module({
  imports: [AuthModule, ContentSupportModule],
  controllers: [AdminCourseController, CourseStructureController, PublicCourseController],
  providers: [CourseService],
  exports: [CourseService],
})
export class CourseModule {}
