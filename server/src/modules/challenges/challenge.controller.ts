import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import type { AuthUser } from '../auth/auth.types'
import { PageQueryDto } from '../../common/content/page-query.dto'
import { ChallengeService } from './challenge.service'
import { CreateChallengeDto, LinkPaperDto, LinkQuestionBankDto, UpdateChallengeDto } from './challenge.dto'

@Controller('admin/challenges')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminChallengeController {
  constructor(private readonly challenges: ChallengeService) {}
  @Delete(':id') @Permissions('challenge.write') remove(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.challenges.remove(id, user.id) }
  @Get() @Permissions('challenge.read') list(@Query() query: PageQueryDto) { return this.challenges.list(query) }
  @Post() @Permissions('challenge.write') create(@Body() input: CreateChallengeDto, @CurrentUser() user: AuthUser) { return this.challenges.create(input, user.id) }
  @Get(':id') @Permissions('challenge.read') detail(@Param('id') id: string) { return this.challenges.detail(id) }
  @Patch(':id') @Permissions('challenge.write') update(@Param('id') id: string, @Body() input: UpdateChallengeDto, @CurrentUser() user: AuthUser) { return this.challenges.update(id, input, user.id) }
  @Post(':id/publish') @Permissions('challenge.publish') publish(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.challenges.setPublished(id, true, user.id) }
  @Post(':id/archive') @Permissions('challenge.publish') archive(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.challenges.setPublished(id, false, user.id) }
  @Put(':id/question-bank') @Permissions('challenge.write', 'question.write')
  linkQuestionBank(@Param('id') id: string, @Body() input: LinkQuestionBankDto) {
    return this.challenges.linkQuestionBank(id, input.questionBankId)
  }
  @Put(':id/paper') @Permissions('challenge.write', 'question.write')
  linkPaper(@Param('id') id: string, @Body() input: LinkPaperDto) {
    return this.challenges.linkPaper(id, input.paperId)
  }
}

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminAssessmentController {
  constructor(private readonly prisma: PrismaService) {}
  @Get('rankings') @Permissions('challenge.read')
  rankings(@Query('challengeId') challengeId = '') {
    return this.prisma.rankingSnapshot.findMany({ where: challengeId ? { challengeId } : {}, orderBy: { periodEnd: 'desc' }, take: 100 })
  }
  @Get('assessment-attempts') @Permissions('challenge.read')
  attempts() {
    return this.prisma.assessmentAttempt.findMany({
      include: { user: { select: { id: true, displayName: true } }, challenge: { select: { id: true, title: true } } },
      orderBy: { submittedAt: 'desc' },
      take: 100,
    })
  }
}

@Controller('challenges')
export class PublicChallengeController {
  constructor(private readonly challenges: ChallengeService) {}
  @Get() list(@Query() query: PageQueryDto) { return this.challenges.list(query, true) }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.challenges.detail(slug, true) }
}
