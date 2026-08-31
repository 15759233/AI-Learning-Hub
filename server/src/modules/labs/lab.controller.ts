import { Body, Controller, Delete, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import type { AuthUser } from '../auth/auth.types'
import { PageQueryDto } from '../../common/content/page-query.dto'
import { CreateLabDto, CreateLabStepDto, LabResourcesDto, ReorderLabDto, UpdateLabDto, UpdateLabStepDto, UpdateLabToolsDto } from './lab.dto'
import { LabService } from './lab.service'

@Controller('admin/labs')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminLabController {
  constructor(private readonly labs: LabService, private readonly prisma: PrismaService) {}
  @Delete(':id') @Permissions('lab.write') remove(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.labs.remove(id, user.id) }
  @Get() @Permissions('lab.read') list(@Query() query: PageQueryDto) { return this.labs.list(query) }
  @Post() @Permissions('lab.write') create(@Body() input: CreateLabDto, @CurrentUser() user: AuthUser) { return this.labs.create(input, user.id) }
  @Get(':id') @Permissions('lab.read') detail(@Param('id') id: string) { return this.labs.detail(id) }
  @Patch(':id') @Permissions('lab.write') update(@Param('id') id: string, @Body() input: UpdateLabDto, @CurrentUser() user: AuthUser) { return this.labs.update(id, input, user.id) }
  @Post(':id/publish') @Permissions('lab.publish') publish(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.labs.setPublished(id, true, user.id) }
  @Post(':id/archive') @Permissions('lab.publish') archive(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.labs.setPublished(id, false, user.id) }

  @Post(':id/steps') @Permissions('lab.write')
  async step(@Param('id') labId: string, @Body() input: CreateLabStepDto) {
    return this.labs.editDraft(labId, (tx) => tx.labStep.create({
      data: { labId, ...input, instruction: input.instruction as Prisma.InputJsonValue, validator: input.validator as Prisma.InputJsonValue },
    }))
  }

  @Patch(':labId/steps/:id') @Permissions('lab.write')
  async updateStep(@Param('labId') labId: string, @Param('id') id: string, @Body() input: UpdateLabStepDto) {
    const { instruction, validator, ...rest } = input
    return this.labs.editDraft(labId, (tx) => tx.labStep.update({
      where: { id, labId },
      data: { ...rest, ...(instruction ? { instruction: instruction as Prisma.InputJsonValue } : {}), ...(validator ? { validator: validator as Prisma.InputJsonValue } : {}) },
    }))
  }

  @Delete(':labId/steps/:id') @Permissions('lab.write')
  async deleteStep(@Param('labId') labId: string, @Param('id') id: string) {
    return this.labs.editDraft(labId, async (tx) => {
      const deleted = await tx.labStep.deleteMany({ where: { id, labId } })
      if (!deleted.count) throw new NotFoundException('步骤不属于当前实训')
      return { deleted: true }
    })
  }

  @Put(':id/steps/reorder') @Permissions('lab.write')
  async reorderSteps(@Param('id') labId: string, @Body() input: ReorderLabDto) {
    return this.labs.editDraft(labId, async (tx) => {
      const valid = await tx.labStep.count({ where: { labId, id: { in: input.items.map((item) => item.id) } } })
      if (valid !== input.items.length) throw new NotFoundException('步骤不属于当前实训')
      for (const item of input.items) await tx.labStep.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })
      return tx.labStep.findMany({ where: { labId }, orderBy: { sortOrder: 'asc' } })
    })
  }

  @Put(':id/tools') @Permissions('lab.write')
  async tools(@Param('id') id: string, @Body() input: UpdateLabToolsDto) {
    await this.labs.editDraft(id, async (tx) => {
      await tx.labToolBinding.deleteMany({ where: { labId: id } })
      for (const [index, item] of input.tools.entries()) {
        const tool = await tx.labTool.upsert({
          where: { name_toolType: { name: item.name, toolType: item.toolType } },
          update: { description: item.description || '', safeConfig: (item.safeConfig || {}) as Prisma.InputJsonValue, enabled: item.enabled ?? true },
          create: { name: item.name, toolType: item.toolType, description: item.description || '', safeConfig: (item.safeConfig || {}) as Prisma.InputJsonValue, enabled: item.enabled ?? true },
        })
        await tx.labToolBinding.create({ data: { labId: id, toolId: tool.id, sortOrder: index + 1 } })
      }
    })
    return this.labs.detail(id)
  }

  @Put(':id/resources') @Permissions('lab.write')
  async resources(@Param('id') labId: string, @Body() input: LabResourcesDto) {
    await this.labs.editDraft(labId, async (tx) => {
      await tx.labResource.deleteMany({ where: { labId } })
      for (const [sortOrder, resourceId] of input.resourceIds.entries()) {
        await tx.labResource.create({ data: { labId, resourceId, sortOrder } })
      }
    })
    return this.labs.detail(labId)
  }

  @Get(':id/runs') @Permissions('lab.read')
  runs(@Param('id') labId: string) {
    return this.prisma.labRun.findMany({ where: { labId }, include: { user: { select: { id: true, displayName: true } } }, orderBy: { startedAt: 'desc' }, take: 100 })
  }
}

@Controller('admin/lab-runs')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminLabRunController {
  constructor(private readonly prisma: PrismaService) {}
  @Get(':runId/report') @Permissions('lab.read')
  async report(@Param('runId') id: string) {
    const run = await this.prisma.labRun.findUnique({
      where: { id },
      include: { user: { select: { id: true, displayName: true } }, lab: { select: { id: true, title: true } }, events: { orderBy: { sequence: 'asc' } } },
    })
    if (!run) throw new NotFoundException('实训运行不存在')
    const persisted = await this.prisma.labReport.findUnique({ where: { runId: id } })
    return { ...run, report: persisted?.summary || { passed: run.status === 'submitted', score: run.score, eventCount: run.events.length } }
  }
}

@Controller('labs')
export class PublicLabController {
  constructor(private readonly labs: LabService) {}
  @Get() list(@Query() query: PageQueryDto) { return this.labs.list(query, true) }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.labs.detail(slug, true) }
}
