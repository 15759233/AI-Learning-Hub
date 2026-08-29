import { Body, Controller, Get, Param, Patch, Post, Put, UseGuards } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { ReorderDto } from '../../common/content/reorder.dto'
import { CreateGrowthRuleDto, RecommendationRulesDto, UpdateGrowthModuleDto, UpdateGrowthRuleDto } from './growth.dto'

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class GrowthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('growth/modules') @Permissions('growth.read')
  modules() { return this.prisma.growthModuleSetting.findMany({ orderBy: { sortOrder: 'asc' } }) }

  @Patch('growth/modules/:id') @Permissions('growth.write')
  module(@Param('id') id: string, @Body() input: UpdateGrowthModuleDto) {
    return this.prisma.growthModuleSetting.update({ where: { id }, data: input })
  }

  @Put('growth/modules/reorder') @Permissions('growth.write')
  async reorder(@Body() input: ReorderDto) {
    await this.prisma.$transaction(input.items.map((item) => this.prisma.growthModuleSetting.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    return this.modules()
  }

  @Get('achievements') @Permissions('growth.read')
  achievements() { return this.prisma.achievement.findMany({ include: { _count: { select: { users: true } } } }) }

  @Post('achievements') @Permissions('growth.write')
  achievement(@Body() input: CreateGrowthRuleDto) {
    return this.prisma.achievement.create({ data: { ...input, rule: input.rule as Prisma.InputJsonValue } })
  }

  @Patch('achievements/:id') @Permissions('growth.write')
  updateAchievement(@Param('id') id: string, @Body() input: UpdateGrowthRuleDto) {
    const { rule, ...rest } = input
    return this.prisma.achievement.update({ where: { id }, data: { ...rest, ...(rule ? { rule: rule as Prisma.InputJsonValue } : {}) } })
  }

  @Get('certificates') @Permissions('growth.read')
  certificates() { return this.prisma.certificate.findMany({ include: { _count: { select: { users: true } } } }) }

  @Post('certificates') @Permissions('growth.write')
  certificate(@Body() input: CreateGrowthRuleDto) {
    return this.prisma.certificate.create({ data: { ...input, rule: input.rule as Prisma.InputJsonValue } })
  }

  @Patch('certificates/:id') @Permissions('growth.write')
  updateCertificate(@Param('id') id: string, @Body() input: UpdateGrowthRuleDto) {
    const { rule, ...rest } = input
    return this.prisma.certificate.update({ where: { id }, data: { ...rest, ...(rule ? { rule: rule as Prisma.InputJsonValue } : {}) } })
  }

  @Get('recommendation-rules') @Permissions('growth.read')
  async recommendationRules() {
    return (await this.prisma.systemSetting.findUnique({ where: { key: 'recommendation_rules' } }))?.value || {}
  }

  @Patch('recommendation-rules') @Permissions('growth.write')
  recommendationRule(@Body() input: RecommendationRulesDto) {
    return this.prisma.systemSetting.upsert({
      where: { key: 'recommendation_rules' },
      update: { value: input.value as Prisma.InputJsonValue },
      create: { key: 'recommendation_rules', value: input.value as Prisma.InputJsonValue, sensitive: false },
    })
  }
}
