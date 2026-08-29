import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import type { AuthUser } from '../auth/auth.types'
import { PageQueryDto } from '../../common/content/page-query.dto'
import { CourseRelationsDto, CreateBlockDto, CreateChapterDto, CreateCourseDto, CreateLessonDto, ReorderCourseDto, UpdateBlockDto, UpdateChapterDto, UpdateCourseDto, UpdateLessonDto } from './course.dto'
import { CourseService } from './course.service'

@Controller('admin/courses')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminCourseController {
  constructor(private readonly courses: CourseService) {}
  @Get() @Permissions('course.read') list(@Query() query: PageQueryDto) { return this.courses.list(query) }
  @Post() @Permissions('course.write') create(@Body() input: CreateCourseDto, @CurrentUser() user: AuthUser) { return this.courses.create(input, user.id) }
  @Get(':id') @Permissions('course.read') detail(@Param('id') id: string) { return this.courses.detail(id) }
  @Patch(':id') @Permissions('course.write') update(@Param('id') id: string, @Body() input: UpdateCourseDto, @CurrentUser() user: AuthUser) { return this.courses.update(id, input, user.id) }
  @Post(':id/publish') @Permissions('course.publish') publish(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.courses.setPublished(id, true, user.id) }
  @Post(':id/archive') @Permissions('course.publish') archive(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.courses.setPublished(id, false, user.id) }
  @Put(':id/relations') @Permissions('course.write') relations(@Param('id') id: string, @Body() input: CourseRelationsDto) { return this.courses.setRelations(id, input.resourceIds, input.labIds) }
}

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class CourseStructureController {
  constructor(private readonly prisma: PrismaService, private readonly courses: CourseService) {}

  @Post('courses/:id/chapters') @Permissions('course.write')
  async chapter(@Param('id') courseId: string, @Body() input: CreateChapterDto) {
    const versionId = await this.courses.ensureDraft(courseId)
    return this.prisma.courseChapter.create({ data: { courseVersionId: versionId, ...input } })
  }

  @Patch('course-chapters/:id') @Permissions('course.write')
  updateChapter(@Param('id') id: string, @Body() input: UpdateChapterDto) {
    return this.prisma.courseChapter.update({ where: { id }, data: input })
  }

  @Delete('course-chapters/:id') @Permissions('course.write')
  deleteChapter(@Param('id') id: string) { return this.prisma.courseChapter.delete({ where: { id } }) }

  @Put('courses/:id/chapters/reorder') @Permissions('course.write')
  async reorderChapters(@Param('id') courseId: string, @Body() input: ReorderCourseDto) {
    const versionId = await this.courses.ensureDraft(courseId)
    const valid = await this.prisma.courseChapter.count({ where: { courseVersionId: versionId, id: { in: input.items.map((item) => item.id) } } })
    if (valid !== input.items.length) throw new NotFoundException('章节不属于当前课程草稿')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.courseChapter.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.prisma.courseChapter.findMany({ where: { courseVersionId: versionId }, orderBy: { sortOrder: 'asc' } })
  }

  @Post('chapters/:id/lessons') @Permissions('course.write')
  lesson(@Param('id') chapterId: string, @Body() input: CreateLessonDto) {
    return this.prisma.courseLesson.create({ data: { chapterId, ...input } })
  }

  @Patch('course-lessons/:id') @Permissions('course.write')
  updateLesson(@Param('id') id: string, @Body() input: UpdateLessonDto) {
    return this.prisma.courseLesson.update({ where: { id }, data: input })
  }

  @Delete('course-lessons/:id') @Permissions('course.write')
  deleteLesson(@Param('id') id: string) { return this.prisma.courseLesson.delete({ where: { id } }) }

  @Put('chapters/:id/lessons/reorder') @Permissions('course.write')
  async reorderLessons(@Param('id') chapterId: string, @Body() input: ReorderCourseDto) {
    const valid = await this.prisma.courseLesson.count({ where: { chapterId, id: { in: input.items.map((item) => item.id) } } })
    if (valid !== input.items.length) throw new NotFoundException('课时不属于当前章节')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.courseLesson.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.prisma.courseLesson.findMany({ where: { chapterId }, orderBy: { sortOrder: 'asc' } })
  }

  @Post('lessons/:id/blocks') @Permissions('course.write')
  block(@Param('id') lessonId: string, @Body() input: CreateBlockDto) {
    return this.prisma.lessonBlock.create({ data: { lessonId, blockType: input.blockType, sortOrder: input.sortOrder, content: input.content as Prisma.InputJsonValue } })
  }

  @Patch('lesson-blocks/:id') @Permissions('course.write')
  updateBlock(@Param('id') id: string, @Body() input: UpdateBlockDto) {
    return this.prisma.lessonBlock.update({
      where: { id },
      data: { ...(input.blockType ? { blockType: input.blockType } : {}), ...(input.content ? { content: input.content as Prisma.InputJsonValue } : {}) },
    })
  }

  @Delete('lesson-blocks/:id') @Permissions('course.write')
  deleteBlock(@Param('id') id: string) { return this.prisma.lessonBlock.delete({ where: { id } }) }

  @Put('lessons/:id/blocks/reorder') @Permissions('course.write')
  async reorderBlocks(@Param('id') lessonId: string, @Body() input: ReorderCourseDto) {
    const valid = await this.prisma.lessonBlock.count({ where: { lessonId, id: { in: input.items.map((item) => item.id) } } })
    if (valid !== input.items.length) throw new NotFoundException('内容块不属于当前课时')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.lessonBlock.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.prisma.lessonBlock.findMany({ where: { lessonId }, orderBy: { sortOrder: 'asc' } })
  }
}

@Controller('courses')
export class PublicCourseController {
  constructor(private readonly courses: CourseService) {}
  @Get() list(@Query() query: PageQueryDto) { return this.courses.list(query, true) }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.courses.detail(slug, true) }
}
