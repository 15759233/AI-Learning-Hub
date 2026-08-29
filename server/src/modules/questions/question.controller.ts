import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { CreatePaperDto, CreateQuestionBankDto, CreateQuestionDto, PaperQuestionsDto, UpdateQuestionDto } from './question.dto'

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class QuestionController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('question-banks') @Permissions('question.read')
  banks() {
    return this.prisma.questionBank.findMany({ include: { _count: { select: { questions: true, challenges: true } } }, orderBy: { createdAt: 'desc' } })
  }

  @Post('question-banks') @Permissions('question.write')
  bank(@Body() input: CreateQuestionBankDto) { return this.prisma.questionBank.create({ data: input }) }

  @Get('questions') @Permissions('question.read')
  questions(@Query('bankId') bankId = '') {
    return this.prisma.question.findMany({ where: bankId ? { bankId } : {}, include: { bank: true, currentDraftVersion: true, publishedVersion: true }, take: 100 })
  }

  @Get('knowledge-points') @Permissions('question.read')
  knowledgePoints() { return this.prisma.knowledgePoint.findMany({ orderBy: { code: 'asc' } }) }

  @Post('questions') @Permissions('question.write')
  question(@Body() input: CreateQuestionDto) {
    return this.prisma.$transaction(async (tx) => {
      const question = await tx.question.create({
        data: { ...input, options: input.options as Prisma.InputJsonValue, standardAnswer: input.standardAnswer as Prisma.InputJsonValue },
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

  @Patch('questions/:id') @Permissions('question.write')
  async updateQuestion(@Param('id') id: string, @Body() input: UpdateQuestionDto) {
    const draftId = await this.ensureDraft(id)
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
      data: { snapshot: { stem: question.stem, options: question.options, standardAnswer: question.standardAnswer, analysis: question.analysis } as Prisma.InputJsonValue },
    })
    return question
  }

  @Get('papers') @Permissions('question.read')
  papers() {
    return this.prisma.paper.findMany({
      include: { questions: { orderBy: { sortOrder: 'asc' }, include: { question: { select: { id: true, stem: true, difficulty: true } } } }, _count: { select: { challenges: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  @Post('papers') @Permissions('question.write')
  paper(@Body() input: CreatePaperDto) { return this.prisma.paper.create({ data: input }) }

  @Put('papers/:id/questions') @Permissions('question.write')
  paperQuestions(@Param('id') paperId: string, @Body() input: PaperQuestionsDto) {
    return this.prisma.$transaction(async (tx) => {
      await tx.paperQuestion.deleteMany({ where: { paperId } })
      for (const item of input.items) await tx.paperQuestion.create({ data: { paperId, ...item } })
      return tx.paper.update({
        where: { id: paperId },
        data: { status: PublishStatus.published, publishedAt: new Date() },
        include: { questions: { orderBy: { sortOrder: 'asc' } } },
      })
    })
  }

  private async ensureDraft(questionId: string) {
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
