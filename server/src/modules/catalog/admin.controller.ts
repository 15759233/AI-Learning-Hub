import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { Prisma } from '@prisma/client'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Roles } from '../auth/roles.decorator'
import { RolesGuard } from '../auth/roles.guard'
import type { AuthUser } from '../auth/auth.types'
import { CatalogService, type CatalogKind } from './catalog.service'
import { CreateCatalogDto, PageQueryDto, UpdateCatalogDto, UpdateHomepageModuleDto, UpdateSettingDto } from './catalog.dto'
import { CreateHomepageItemDto, CreateHomepageModuleDto, ReorderDto } from './admin-platform.dto'

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles('admin')
export class AdminCatalogController {
  constructor(private readonly catalog: CatalogService, private readonly prisma: PrismaService) {}

  @Get('dashboard')
  async dashboard() {
    const start = new Date()
    start.setDate(start.getDate() - 7)
    const [users, active, courses, labRuns, activity] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.activityEvent.count({ where: { createdAt: { gte: start } } }),
      this.prisma.course.count({ where: { publishedAt: { gte: start } } }),
      this.prisma.labRun.count({ where: { startedAt: { gte: start } } }),
      this.prisma.activityEvent.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    ])
    return { kpis: { users, active, courses, labRuns }, activity }
  }

  @Get('homepage/modules')
  async modules() {
    const modules = await this.prisma.homepageModule.findMany({ orderBy: { sortOrder: 'asc' }, include: { items: { orderBy: { sortOrder: 'asc' } } } })
    return Promise.all(modules.map(async (module) => ({
      ...module,
      items: await Promise.all(module.items.map(async (item) => ({ ...item, relationValid: await this.catalog.isPublishedTarget(item.targetType, item.targetId) }))),
    })))
  }

  @Get('homepage/preview')
  preview() { return this.modules() }

  @Post('homepage/modules')
  async createModule(@Body() input: CreateHomepageModuleDto) {
    const module = await this.prisma.homepageModule.create({
      data: {
        moduleKey: input.moduleKey,
        name: input.moduleName,
        moduleType: input.moduleType,
        config: input.config as Prisma.InputJsonValue,
        sortOrder: input.sortOrder,
      },
    })
    await this.createHomepageDraft(module.id)
    return module
  }

  @Patch('homepage/modules/:id')
  async module(@Param('id') id: string, @Body() input: UpdateHomepageModuleDto) {
    const { config, ...rest } = input
    const module = await this.prisma.homepageModule.update({
      where: { id },
      data: { ...rest, ...(config ? { config: config as Prisma.InputJsonValue } : {}) },
    })
    await this.createHomepageDraft(id)
    return module
  }

  @Put('homepage/modules/reorder')
  async reorderModules(@Body() input: ReorderDto) {
    await this.prisma.$transaction(input.items.map((item) => this.prisma.homepageModule.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    for (const item of input.items) await this.createHomepageDraft(item.id)
    return this.modules()
  }

  @Post('homepage/modules/:id/items')
  async item(@Param('id') moduleId: string, @Body() input: CreateHomepageItemDto) {
    const item = await this.prisma.homepageItem.create({ data: { moduleId, ...input } })
    await this.createHomepageDraft(moduleId)
    return item
  }

  @Delete('homepage/modules/:id/items/:itemId')
  async deleteItem(@Param('id') moduleId: string, @Param('itemId') id: string) {
    await this.prisma.homepageItem.deleteMany({ where: { id, moduleId } })
    await this.createHomepageDraft(moduleId)
    return { deleted: true }
  }

  @Post('homepage/publish')
  async publishHomepage() {
    const modules = await this.prisma.homepageModule.findMany({ where: { enabled: true }, orderBy: { sortOrder: 'asc' } })
    for (const module of modules) {
      const draftId = await this.createHomepageDraft(module.id)
      await this.prisma.homepageModule.update({
        where: { id: module.id },
        data: { status: 'published', publishedAt: new Date(), publishedVersionId: draftId },
      })
    }
    const published = await this.prisma.homepageModule.findMany({
      where: { enabled: true, status: 'published' },
      orderBy: { sortOrder: 'asc' },
      include: { items: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
    })
    const latest = await this.prisma.homepagePublication.findFirst({ orderBy: { version: 'desc' } })
    return this.prisma.homepagePublication.create({
      data: { version: (latest?.version || 0) + 1, snapshot: JSON.parse(JSON.stringify(published)) as Prisma.InputJsonValue },
    })
  }

  @Get('settings')
  async settings() {
    const settings = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
    return settings.map((item) => ({ key: item.key, value: item.sensitive ? null : item.value, sensitive: item.sensitive, updatedAt: item.updatedAt }))
  }

  @Patch('settings')
  setting(@Body() input: UpdateSettingDto) {
    return this.prisma.systemSetting.upsert({
      where: { key: input.key },
      update: { value: input.value as any },
      create: { key: input.key, value: input.value as any, sensitive: false },
    })
  }

  @Get(':kind')
  list(@Param('kind') kind: CatalogKind, @Query() query: PageQueryDto) {
    return this.catalog.list(this.kind(kind), query)
  }

  @Post(':kind')
  create(@Param('kind') kind: CatalogKind, @Body() input: CreateCatalogDto, @CurrentUser() user: AuthUser) {
    return this.catalog.create(this.kind(kind), input, user.id)
  }

  @Get(':kind/:id')
  detail(@Param('kind') kind: CatalogKind, @Param('id') id: string) {
    return this.catalog.detail(this.kind(kind), id)
  }

  @Patch(':kind/:id')
  update(@Param('kind') kind: CatalogKind, @Param('id') id: string, @Body() input: UpdateCatalogDto, @CurrentUser() user: AuthUser) {
    return this.catalog.update(this.kind(kind), id, input, user.id)
  }

  @Post(':kind/:id/publish')
  publish(@Param('kind') kind: CatalogKind, @Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.publish(this.kind(kind), id, user.id)
  }

  @Post(':kind/:id/archive')
  archive(@Param('kind') kind: CatalogKind, @Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.catalog.archive(this.kind(kind), id, user.id)
  }

  private kind(kind: string): CatalogKind {
    const allowed: CatalogKind[] = ['themes', 'courses', 'labs', 'resources', 'articles', 'challenges']
    if (!allowed.includes(kind as CatalogKind)) throw new Error('不支持的内容类型')
    return kind as CatalogKind
  }

  private async createHomepageDraft(moduleId: string) {
    const module = await this.prisma.homepageModule.findUnique({
      where: { id: moduleId },
      include: { items: { orderBy: { sortOrder: 'asc' } }, _count: { select: { versions: true } } },
    })
    if (!module) throw new Error('首页模块不存在')
    const snapshot = JSON.parse(JSON.stringify({
      moduleKey: module.moduleKey,
      name: module.name,
      moduleType: module.moduleType,
      enabled: module.enabled,
      sortOrder: module.sortOrder,
      config: module.config,
      items: module.items,
    })) as Prisma.InputJsonValue
    if (module.currentDraftVersionId && module.currentDraftVersionId !== module.publishedVersionId) {
      await this.prisma.homepageModuleVersion.update({ where: { id: module.currentDraftVersionId }, data: { snapshot } })
      return module.currentDraftVersionId
    }
    const version = await this.prisma.homepageModuleVersion.create({
      data: { moduleId, versionNo: module._count.versions + 1, snapshot },
    })
    await this.prisma.homepageModule.update({ where: { id: moduleId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }
}
