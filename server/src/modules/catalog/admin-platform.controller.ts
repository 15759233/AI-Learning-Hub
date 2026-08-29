import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import {
  CreateBlockDto,
  CreateChapterDto,
  CreateGrowthRuleDto,
  CreateLabStepDto,
  CreateLessonDto,
  CreateQuestionBankDto,
  CreateQuestionDto,
  CreateSchoolDto,
  CreateDepartmentDto,
  CreateNotificationDto,
  CreatePaperDto,
  ArticleRecommendationsDto,
  LinkPaperDto,
  PaperQuestionsDto,
  RecommendationRulesDto,
  ReorderDto,
  ScheduleArticleDto,
  LinkQuestionBankDto,
  UpdateGrowthModuleDto,
  UpdateGrowthRuleDto,
  UpdateQuestionDto,
  UpdateLabToolsDto,
  UpsertPathDto,
} from './admin-platform.dto'
import { CatalogService } from './catalog.service'

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminPlatformController {
  constructor(private readonly prisma: PrismaService, private readonly catalog: CatalogService) {}

  @Put('themes/:id/path')
  async path(@Param('id') themeId: string, @Body() input: UpsertPathDto) {
    const theme = await this.prisma.theme.findUnique({ where: { id: themeId } })
    if (!theme) throw new NotFoundException('主题不存在')
    return this.prisma.$transaction(async (tx) => {
      const path = await tx.learningPath.upsert({
        where: { themeId_name: { themeId, name: input.name } },
        update: { description: input.description },
        create: { themeId, name: input.name, description: input.description, status: PublishStatus.published },
      })
      await tx.learningPathStage.deleteMany({ where: { pathId: path.id } })
      for (const [index, stage] of input.stages.entries()) {
        const created = await tx.learningPathStage.create({
          data: {
            pathId: path.id,
            name: stage.name,
            stageType: stage.stageType,
            description: stage.description || '',
            sortOrder: index + 1,
          },
        })
        if (stage.targetType && stage.targetId) {
          await tx.pathContent.create({ data: { stageId: created.id, targetType: stage.targetType, targetId: stage.targetId } })
        }
      }
      return tx.learningPath.findUnique({ where: { id: path.id }, include: { stages: { orderBy: { sortOrder: 'asc' }, include: { contents: true } } } })
    })
  }

  @Post('courses/:id/chapters')
  async chapter(@Param('id') courseId: string, @Body() input: CreateChapterDto) {
    const versionId = await this.catalog.ensureCourseDraft(courseId)
    return this.prisma.courseChapter.create({ data: { courseVersionId: versionId, ...input } })
  }

  @Put('courses/:id/chapters/reorder')
  async reorderChapters(@Param('id') courseId: string, @Body() input: ReorderDto) {
    const versionId = await this.catalog.ensureCourseDraft(courseId)
    const valid = await this.prisma.courseChapter.count({ where: { courseVersionId: versionId, id: { in: input.items.map((item) => item.id) } } })
    if (valid !== input.items.length) throw new NotFoundException('章节不属于当前课程草稿')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.courseChapter.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.prisma.courseChapter.findMany({ where: { courseVersionId: versionId }, orderBy: { sortOrder: 'asc' } })
  }

  @Post('chapters/:id/lessons')
  lesson(@Param('id') chapterId: string, @Body() input: CreateLessonDto) {
    return this.prisma.courseLesson.create({ data: { chapterId, ...input } })
  }

  @Post('lessons/:id/blocks')
  block(@Param('id') lessonId: string, @Body() input: CreateBlockDto) {
    return this.prisma.lessonBlock.create({
      data: { lessonId, blockType: input.blockType, sortOrder: input.sortOrder, content: input.content as Prisma.InputJsonValue },
    })
  }

  @Put('lessons/:id/blocks/reorder')
  async reorderBlocks(@Param('id') lessonId: string, @Body() input: ReorderDto) {
    const valid = await this.prisma.lessonBlock.count({ where: { lessonId, id: { in: input.items.map((item) => item.id) } } })
    if (valid !== input.items.length) throw new NotFoundException('内容块不属于当前课时')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.lessonBlock.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.prisma.lessonBlock.findMany({ where: { lessonId }, orderBy: { sortOrder: 'asc' } })
  }

  @Post('labs/:id/steps')
  async step(@Param('id') labId: string, @Body() input: CreateLabStepDto) {
    await this.catalog.ensureLabDraft(labId)
    const step = await this.prisma.labStep.create({
      data: {
        labId,
        stepKey: input.stepKey,
        title: input.title,
        description: input.description,
        sortOrder: input.sortOrder,
        instruction: input.instruction as Prisma.InputJsonValue,
        validator: input.validator as Prisma.InputJsonValue,
        score: input.score,
      },
    })
    await this.catalog.refreshLabDraft(labId)
    return step
  }

  @Put('labs/:id/steps/reorder')
  async reorderSteps(@Param('id') labId: string, @Body() input: ReorderDto) {
    await this.catalog.ensureLabDraft(labId)
    const valid = await this.prisma.labStep.count({ where: { labId, id: { in: input.items.map((item) => item.id) } } })
    if (valid !== input.items.length) throw new NotFoundException('步骤不属于当前实训')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.labStep.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    await this.catalog.refreshLabDraft(labId)
    return this.prisma.labStep.findMany({ where: { labId }, orderBy: { sortOrder: 'asc' } })
  }

  @Put('labs/:id/tools')
  async labTools(@Param('id') id: string, @Body() input: UpdateLabToolsDto) {
    await this.catalog.ensureLabDraft(id)
    const lab = await this.prisma.lab.findUnique({ where: { id } })
    if (!lab) throw new NotFoundException('实训不存在')
    const payload = lab.payload && typeof lab.payload === 'object' && !Array.isArray(lab.payload) ? lab.payload as Record<string, unknown> : {}
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.labToolBinding.deleteMany({ where: { labId: id } })
      for (const [index, item] of input.tools.entries()) {
        const tool = await tx.labTool.upsert({
          where: { name_toolType: { name: item.name, toolType: item.toolType } },
          update: {
            description: item.description || '',
            safeConfig: (item.safeConfig || {}) as Prisma.InputJsonValue,
            enabled: item.enabled ?? true,
          },
          create: {
            name: item.name,
            toolType: item.toolType,
            description: item.description || '',
            safeConfig: (item.safeConfig || {}) as Prisma.InputJsonValue,
            enabled: item.enabled ?? true,
          },
        })
        await tx.labToolBinding.create({ data: { labId: id, toolId: tool.id, sortOrder: index + 1 } })
      }
      return tx.lab.update({ where: { id }, data: { payload: { ...payload, tools: input.tools } as Prisma.InputJsonValue } })
    })
    await this.catalog.refreshLabDraft(id)
    return updated
  }

  @Get('labs/:id/runs')
  runs(@Param('id') labId: string) {
    return this.prisma.labRun.findMany({ where: { labId }, include: { user: { select: { id: true, displayName: true } } }, orderBy: { startedAt: 'desc' }, take: 100 })
  }

  @Get('lab-runs/:runId/report')
  async runReport(@Param('runId') id: string) {
    const run = await this.prisma.labRun.findUnique({
      where: { id },
      include: { user: { select: { id: true, displayName: true } }, lab: { select: { id: true, title: true } }, events: { orderBy: { sequence: 'asc' } } },
    })
    if (!run) throw new NotFoundException('实训运行不存在')
    const persisted = await this.prisma.labReport.findUnique({ where: { runId: id } })
    return { ...run, report: persisted?.summary || { passed: run.status === 'submitted', score: run.score, eventCount: run.events.length } }
  }

  @Get('schools')
  schools() {
    return this.prisma.school.findMany({ include: { departments: { orderBy: { name: 'asc' } }, _count: { select: { users: true } } }, orderBy: { name: 'asc' } })
  }

  @Post('schools')
  school(@Body() input: CreateSchoolDto) {
    return this.prisma.school.create({ data: input })
  }

  @Post('schools/:id/departments')
  department(@Param('id') schoolId: string, @Body() input: CreateDepartmentDto) {
    return this.prisma.department.create({ data: { schoolId, ...input } })
  }

  @Post('articles/:id/schedule')
  async scheduleArticle(@Param('id') id: string, @Body() input: ScheduleArticleDto) {
    await this.catalog.ensureArticleDraft(id)
    await this.catalog.refreshArticleDraft(id)
    return this.prisma.article.update({ where: { id }, data: { scheduledAt: new Date(input.scheduledAt), status: PublishStatus.reviewing } })
  }

  @Put('articles/:id/recommendations')
  articleRecommendations(@Param('id') articleId: string, @Body() input: ArticleRecommendationsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.articleRecommendation.deleteMany({ where: { articleId } })
      for (const item of input.items) {
        await tx.articleRecommendation.create({
          data: {
            articleId,
            positionKey: item.positionKey,
            sortOrder: item.sortOrder || 0,
            startAt: item.startAt ? new Date(item.startAt) : null,
            endAt: item.endAt ? new Date(item.endAt) : null,
            enabled: item.enabled ?? true,
          },
        })
      }
      return tx.articleRecommendation.findMany({ where: { articleId }, orderBy: { sortOrder: 'asc' } })
    })
  }

  @Get('rankings')
  rankings(@Query('challengeId') challengeId = '') {
    return this.prisma.rankingSnapshot.findMany({ where: challengeId ? { challengeId } : {}, orderBy: { periodEnd: 'desc' }, take: 100 })
  }

  @Get('notifications')
  notifications() {
    return this.prisma.notification.findMany({ include: { _count: { select: { reads: true } } }, orderBy: { createdAt: 'desc' } })
  }

  @Post('notifications')
  notification(@Body() input: CreateNotificationDto) {
    return this.prisma.notification.create({ data: input })
  }

  @Post('notifications/:id/publish')
  publishNotification(@Param('id') id: string) {
    return this.prisma.notification.update({ where: { id }, data: { status: PublishStatus.published, publishedAt: new Date() } })
  }

  @Post('notifications/:id/archive')
  archiveNotification(@Param('id') id: string) {
    return this.prisma.notification.update({ where: { id }, data: { status: PublishStatus.archived } })
  }

  @Get('audit-logs')
  auditLogs() {
    return this.prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  }

  @Get('operation-logs')
  operationLogs() {
    return this.prisma.operationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 100 })
  }

  @Get('login-logs')
  loginLogs() {
    return this.prisma.loginLog.findMany({ select: { id: true, userId: true, email: true, result: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 100 })
  }

  @Get('question-banks')
  banks() {
    return this.prisma.questionBank.findMany({ include: { _count: { select: { questions: true, challenges: true } } }, orderBy: { createdAt: 'desc' } })
  }

  @Post('question-banks')
  bank(@Body() input: CreateQuestionBankDto) {
    return this.prisma.questionBank.create({ data: input })
  }

  @Get('questions')
  questions(@Query('bankId') bankId = '') {
    return this.prisma.question.findMany({ where: bankId ? { bankId } : {}, include: { bank: true, currentDraftVersion: true, publishedVersion: true }, take: 100 })
  }

  @Post('questions')
  question(@Body() input: CreateQuestionDto) {
    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: {
          ...input,
          options: input.options as Prisma.InputJsonValue,
          standardAnswer: input.standardAnswer as Prisma.InputJsonValue,
        },
      })
      const version = await tx.questionVersion.create({
        data: {
          questionId: question.id,
          versionNo: 1,
          snapshot: { stem: input.stem, options: input.options, standardAnswer: input.standardAnswer, analysis: input.analysis } as Prisma.InputJsonValue,
        },
      })
      return tx.question.update({ where: { id: question.id }, data: { currentDraftVersionId: version.id } })
    })
  }

  @Patch('questions/:id')
  async updateQuestion(@Param('id') id: string, @Body() input: UpdateQuestionDto) {
    const draftId = await this.ensureQuestionDraft(id)
    const { options, standardAnswer, ...rest } = input
    const question = await this.prisma.question.update({
      where: { id },
      data: {
        ...rest,
        ...(options ? { options: options as Prisma.InputJsonValue } : {}),
        ...(standardAnswer !== undefined ? { standardAnswer: standardAnswer as Prisma.InputJsonValue } : {}),
        ...(input.status === 'published' ? { publishedVersionId: draftId } : {}),
      },
    })
    await this.prisma.questionVersion.update({
      where: { id: draftId },
      data: {
        snapshot: {
          stem: question.stem,
          options: question.options,
          standardAnswer: question.standardAnswer,
          analysis: question.analysis,
        } as Prisma.InputJsonValue,
      },
    })
    return question
  }

  @Put('challenges/:id/question-bank')
  linkQuestionBank(@Param('id') id: string, @Body() input: LinkQuestionBankDto) {
    return this.prisma.challenge.update({ where: { id }, data: { questionBankId: input.questionBankId } })
  }

  @Get('assessment-attempts')
  attempts() {
    return this.prisma.assessmentAttempt.findMany({
      include: { user: { select: { id: true, displayName: true } }, challenge: { select: { id: true, title: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    })
  }

  @Get('papers')
  papers() {
    return this.prisma.paper.findMany({ include: { questions: { orderBy: { sortOrder: 'asc' }, include: { question: { select: { id: true, stem: true, difficulty: true } } } }, _count: { select: { challenges: true } } }, orderBy: { createdAt: 'desc' } })
  }

  @Post('papers')
  paper(@Body() input: CreatePaperDto) {
    return this.prisma.paper.create({ data: input })
  }

  @Put('papers/:id/questions')
  paperQuestions(@Param('id') paperId: string, @Body() input: PaperQuestionsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.paperQuestion.deleteMany({ where: { paperId } })
      for (const item of input.items) await tx.paperQuestion.create({ data: { paperId, ...item } })
      return tx.paper.update({ where: { id: paperId }, data: { status: PublishStatus.published, publishedAt: new Date() }, include: { questions: { orderBy: { sortOrder: 'asc' } } } })
    })
  }

  @Put('challenges/:id/paper')
  linkPaper(@Param('id') id: string, @Body() input: LinkPaperDto) {
    return this.prisma.challenge.update({ where: { id }, data: { paperId: input.paperId } })
  }

  @Get('growth/modules')
  growthModules() {
    return this.prisma.growthModuleSetting.findMany({ orderBy: { sortOrder: 'asc' } })
  }

  @Patch('growth/modules/:id')
  growthModule(@Param('id') id: string, @Body() input: UpdateGrowthModuleDto) {
    return this.prisma.growthModuleSetting.update({ where: { id }, data: input })
  }

  @Put('growth/modules/reorder')
  async reorderGrowthModules(@Body() input: ReorderDto) {
    await this.prisma.$transaction(input.items.map((item) => this.prisma.growthModuleSetting.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.growthModules()
  }

  @Get('achievements')
  achievements() {
    return this.prisma.achievement.findMany({ include: { _count: { select: { users: true } } } })
  }

  @Post('achievements')
  achievement(@Body() input: CreateGrowthRuleDto) {
    return this.prisma.achievement.create({ data: { ...input, rule: input.rule as Prisma.InputJsonValue } })
  }

  @Patch('achievements/:id')
  updateAchievement(@Param('id') id: string, @Body() input: UpdateGrowthRuleDto) {
    const { rule, ...rest } = input
    return this.prisma.achievement.update({
      where: { id },
      data: { ...rest, ...(rule ? { rule: rule as Prisma.InputJsonValue } : {}) },
    })
  }

  @Get('certificates')
  certificates() {
    return this.prisma.certificate.findMany({ include: { _count: { select: { users: true } } } })
  }

  @Post('certificates')
  certificate(@Body() input: CreateGrowthRuleDto) {
    return this.prisma.certificate.create({ data: { ...input, rule: input.rule as Prisma.InputJsonValue } })
  }

  @Patch('certificates/:id')
  updateCertificate(@Param('id') id: string, @Body() input: UpdateGrowthRuleDto) {
    const { rule, ...rest } = input
    return this.prisma.certificate.update({
      where: { id },
      data: { ...rest, ...(rule ? { rule: rule as Prisma.InputJsonValue } : {}) },
    })
  }

  @Get('recommendation-rules')
  async recommendationRules() {
    return (await this.prisma.systemSetting.findUnique({ where: { key: 'recommendation_rules' } }))?.value || {}
  }

  @Patch('recommendation-rules')
  recommendationRule(@Body() input: RecommendationRulesDto) {
    return this.prisma.systemSetting.upsert({
      where: { key: 'recommendation_rules' },
      update: { value: input.value as Prisma.InputJsonValue },
      create: { key: 'recommendation_rules', value: input.value as Prisma.InputJsonValue, sensitive: false },
    })
  }

  private async ensureQuestionDraft(questionId: string) {
    const question = await this.prisma.question.findUnique({
      where: { id: questionId },
      include: { currentDraftVersion: true, _count: { select: { versions: true } } },
    })
    if (!question) throw new NotFoundException('题目不存在')
    if (question.currentDraftVersionId && question.currentDraftVersionId !== question.publishedVersionId) return question.currentDraftVersionId
    const version = await this.prisma.questionVersion.create({
      data: {
        questionId,
        versionNo: question._count.versions + 1,
        snapshot: (question.currentDraftVersion?.snapshot || {
          stem: question.stem,
          options: question.options,
          standardAnswer: question.standardAnswer,
          analysis: question.analysis,
        }) as Prisma.InputJsonValue,
      },
    })
    await this.prisma.question.update({ where: { id: questionId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }
}
