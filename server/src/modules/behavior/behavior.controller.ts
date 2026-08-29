import { Body, Controller, Delete, Get, Headers, Param, Patch, Post, Put, Query, Sse, UseGuards } from '@nestjs/common'
import { interval, map, startWith, type Observable } from 'rxjs'
import { RawResponse } from '../../common/raw-response.decorator'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthUser } from '../auth/auth.types'
import { BehaviorService } from './behavior.service'
import { CreatePlanDto, FavoriteDto, LabActionDto, NoteDto, ProgressDto, SubmitAssessmentDto, UpdatePlanDto } from './behavior.dto'

@Controller()
@UseGuards(AuthGuard)
export class BehaviorController {
  constructor(private readonly behavior: BehaviorService, private readonly prisma: PrismaService) {}

  @Post('courses/:courseId/enroll')
  async enroll(@CurrentUser() user: AuthUser, @Param('courseId') courseId: string) {
    const course = await this.prisma.course.findFirst({ where: { OR: [{ id: courseId }, { slug: courseId }], status: 'published' } })
    if (!course) return { enrolled: false }
    await this.prisma.activityEvent.create({ data: { userId: user.id, eventType: 'course_enroll', targetType: 'course', targetId: course.id } })
    return { enrolled: true, courseId: course.id }
  }

  @Put('courses/:courseId/progress')
  courseProgress(@CurrentUser() user: AuthUser, @Param('courseId') courseId: string, @Body() input: ProgressDto) {
    return this.behavior.setCourseProgress(user.id, courseId, input.progress)
  }

  @Put('courses/:courseId/note')
  courseNote(@CurrentUser() user: AuthUser, @Param('courseId') courseId: string, @Body() input: NoteDto) {
    return this.behavior.saveCourseNote(user.id, courseId, input.content)
  }

  @Put('lessons/:lessonId/progress')
  progress(@CurrentUser() user: AuthUser, @Param('lessonId') lessonId: string, @Body() input: ProgressDto) {
    return this.behavior.setProgress(user.id, lessonId, input.progress)
  }

  @Put('lessons/:lessonId/note')
  note(@CurrentUser() user: AuthUser, @Param('lessonId') lessonId: string, @Body() input: NoteDto) {
    return this.behavior.saveNote(user.id, lessonId, input.content)
  }

  @Get('me/progress')
  progressList(@CurrentUser() user: AuthUser) {
    return this.prisma.lessonProgress.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
  }

  @Get('me/courses')
  courses(@CurrentUser() user: AuthUser) {
    return this.prisma.lessonProgress.findMany({
      where: { userId: user.id },
      distinct: ['courseId'],
      orderBy: { updatedAt: 'desc' },
      include: { course: { select: { id: true, slug: true, title: true, summary: true, status: true } } },
    })
  }

  @Get('me/notes')
  notes(@CurrentUser() user: AuthUser) {
    return this.prisma.learningNote.findMany({ where: { userId: user.id }, orderBy: { updatedAt: 'desc' } })
  }

  @Post('labs/:labId/runs')
  startLab(@CurrentUser() user: AuthUser, @Param('labId') labId: string) {
    return this.behavior.startLab(user.id, labId)
  }

  @Get('lab-runs/:runId')
  run(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.prisma.labRun.findFirst({ where: { id: runId, userId: user.id }, include: { events: { orderBy: { sequence: 'asc' } } } })
  }

  @Post('lab-runs/:runId/actions')
  action(@CurrentUser() user: AuthUser, @Param('runId') runId: string, @Body() input: LabActionDto) {
    return this.behavior.actOnLab(user.id, runId, input)
  }

  @Post('lab-runs/:runId/submit')
  submitLab(@CurrentUser() user: AuthUser, @Param('runId') runId: string) {
    return this.behavior.submitLab(user.id, runId)
  }

  @Sse('lab-runs/:runId/events')
  @RawResponse()
  events(@Param('runId') runId: string): Observable<MessageEvent> {
    return interval(3000).pipe(startWith(0), map((sequence) => ({ data: { type: 'heartbeat', sequence, runId, timestamp: new Date().toISOString() } }) as MessageEvent))
  }

  @Post('favorites')
  favorite(@CurrentUser() user: AuthUser, @Body() input: FavoriteDto) {
    return this.prisma.favorite.upsert({
      where: { userId_targetType_targetId: { userId: user.id, targetType: input.targetType, targetId: input.targetId } },
      update: {},
      create: { userId: user.id, targetType: input.targetType, targetId: input.targetId },
    })
  }

  @Delete('favorites/:targetType/:targetId')
  unfavorite(@CurrentUser() user: AuthUser, @Param('targetType') targetType: any, @Param('targetId') targetId: string) {
    return this.prisma.favorite.deleteMany({ where: { userId: user.id, targetType, targetId } })
  }

  @Get('me/favorites')
  favorites(@CurrentUser() user: AuthUser) {
    return this.prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  }

  @Get('me/growth')
  async growth(@CurrentUser() user: AuthUser) {
    const [points, progress, notes, labs, attempts, plans, favorites, achievements, certificates, knowledgeStats] = await this.prisma.$transaction([
      this.prisma.growthPoint.aggregate({ where: { userId: user.id }, _sum: { points: true } }),
      this.prisma.lessonProgress.findMany({ where: { userId: user.id }, include: { course: { select: { slug: true } } } }),
      this.prisma.learningNote.findMany({ where: { userId: user.id }, include: { course: { select: { slug: true } } } }),
      this.prisma.labRun.findMany({ where: { userId: user.id }, include: { lab: { select: { slug: true } } }, orderBy: { startedAt: 'desc' }, take: 20 }),
      this.prisma.assessmentAttempt.findMany({ where: { userId: user.id }, orderBy: { submittedAt: 'desc' }, take: 20 }),
      this.prisma.learningPlan.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.favorite.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } }),
      this.prisma.userAchievement.findMany({ where: { userId: user.id }, include: { achievement: true } }),
      this.prisma.userCertificate.findMany({ where: { userId: user.id }, include: { certificate: true } }),
      this.prisma.userKnowledgeStat.findMany({ where: { userId: user.id } }),
    ])
    return { points: points._sum.points || 0, courseProgress: progress, notes, labRuns: labs, assessmentAttempts: attempts, plans, favorites, achievements, certificates, knowledgeStats }
  }

  @Get('me/learning-plans')
  plans(@CurrentUser() user: AuthUser) {
    return this.prisma.learningPlan.findMany({ where: { userId: user.id }, orderBy: { createdAt: 'desc' } })
  }

  @Get('me/notifications')
  async notifications(@CurrentUser() user: AuthUser) {
    const notifications = await this.prisma.notification.findMany({
      where: {
        status: 'published',
        OR: [{ audience: 'all' }, { audience: `user:${user.id}` }],
      },
      include: { reads: { where: { userId: user.id }, select: { readAt: true } } },
      orderBy: { publishedAt: 'desc' },
      take: 50,
    })
    return notifications.map((item) => ({ ...item, readAt: item.reads[0]?.readAt || null, reads: undefined }))
  }

  @Post('me/notifications/:id/read')
  readNotification(@CurrentUser() user: AuthUser, @Param('id') notificationId: string) {
    return this.prisma.notificationRead.upsert({
      where: { notificationId_userId: { notificationId, userId: user.id } },
      update: { readAt: new Date() },
      create: { notificationId, userId: user.id },
    })
  }

  @Post('me/learning-plans')
  createPlan(@CurrentUser() user: AuthUser, @Body() input: CreatePlanDto) {
    return this.prisma.learningPlan.create({ data: { userId: user.id, title: input.title, startDate: new Date(), targetDate: new Date(input.targetDate) } })
  }

  @Patch('me/learning-plans/:id')
  updatePlan(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: UpdatePlanDto) {
    return this.prisma.learningPlan.update({ where: { id, userId: user.id }, data: input })
  }

  @Get('challenges/:slug/questions')
  async questions(@Param('slug') slug: string) {
    const challenge = await this.prisma.challenge.findFirst({ where: { slug, status: 'published' } })
    if (!challenge?.questionBankId && !challenge?.paperId) return []
    if (challenge.paperId) {
      const items = await this.prisma.paperQuestion.findMany({
        where: { paperId: challenge.paperId, question: { status: 'published' } },
        orderBy: { sortOrder: 'asc' },
        include: { question: { include: { publishedVersion: true } } },
      })
      return items.map((item) => {
        const snapshot = item.question.publishedVersion?.snapshot && typeof item.question.publishedVersion.snapshot === 'object' && !Array.isArray(item.question.publishedVersion.snapshot)
          ? item.question.publishedVersion.snapshot as Record<string, unknown>
          : {}
        return { id: item.question.id, questionType: item.question.questionType, difficulty: item.question.difficulty, stem: snapshot.stem || item.question.stem, options: snapshot.options || item.question.options }
      })
    }
    const questions = await this.prisma.question.findMany({ where: { bankId: challenge.questionBankId!, status: 'published' }, include: { publishedVersion: true } })
    return questions.map((question) => {
      const snapshot = question.publishedVersion?.snapshot && typeof question.publishedVersion.snapshot === 'object' && !Array.isArray(question.publishedVersion.snapshot)
        ? question.publishedVersion.snapshot as Record<string, unknown>
        : {}
      return { id: question.id, questionType: question.questionType, difficulty: question.difficulty, stem: snapshot.stem || question.stem, options: snapshot.options || question.options }
    })
  }

  @Post('challenges/:slug/submit')
  assessment(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Body() input: SubmitAssessmentDto, @Headers('idempotency-key') key?: string) {
    return this.behavior.submitAssessment(user.id, slug, input, key)
  }

  @Get('challenges/:slug/ranking')
  async ranking(@Param('slug') slug: string) {
    const challenge = await this.prisma.challenge.findFirst({ where: { slug, status: 'published' } })
    if (!challenge) return []
    const snapshot = await this.prisma.rankingSnapshot.findFirst({ where: { challengeId: challenge.id }, orderBy: { periodEnd: 'desc' } })
    return snapshot?.rankings || []
  }
}

@Controller('admin/users')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminUserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  users(@Query('keyword') keyword = '') {
    return this.prisma.user.findMany({
      where: keyword ? { OR: [{ displayName: { contains: keyword, mode: 'insensitive' } }, { email: { contains: keyword, mode: 'insensitive' } }] } : {},
      select: { id: true, displayName: true, email: true, status: true, userType: true, school: true, department: true, lastLoginAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  @Get(':id/growth')
  async growth(@Param('id') userId: string) {
    const [user, points, progress, runs, attempts, favorites, plans, achievements, certificates, knowledgeStats, wrongQuestions] = await this.prisma.$transaction([
      this.prisma.user.findUnique({ where: { id: userId }, select: { id: true, displayName: true, email: true, status: true, userType: true, school: true, department: true, profile: true } }),
      this.prisma.growthPoint.aggregate({ where: { userId }, _sum: { points: true } }),
      this.prisma.lessonProgress.findMany({ where: { userId } }),
      this.prisma.labRun.findMany({ where: { userId }, orderBy: { startedAt: 'desc' }, take: 20 }),
      this.prisma.assessmentAttempt.findMany({ where: { userId }, orderBy: { submittedAt: 'desc' }, take: 20 }),
      this.prisma.favorite.findMany({ where: { userId } }),
      this.prisma.learningPlan.findMany({ where: { userId } }),
      this.prisma.userAchievement.findMany({ where: { userId }, include: { achievement: true } }),
      this.prisma.userCertificate.findMany({ where: { userId }, include: { certificate: true } }),
      this.prisma.userKnowledgeStat.findMany({ where: { userId } }),
      this.prisma.wrongQuestion.findMany({ where: { userId, resolvedAt: null }, select: { id: true, questionId: true, updatedAt: true } }),
    ])
    return { user, points: points._sum.points || 0, progress, runs, attempts, favorites, plans, achievements, certificates, knowledgeStats, wrongQuestions }
  }
}
