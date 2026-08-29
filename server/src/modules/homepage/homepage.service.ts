import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { HomepageModuleKey, HomepageResolvedItemDto, PublicHomepageDto } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'
import { ArticleService } from '../articles/article.service'
import { ChallengeService } from '../challenges/challenge.service'
import { CourseService } from '../courses/course.service'
import { LabService } from '../labs/lab.service'
import { ResourceService } from '../resources/resource.service'
import { ThemeService } from '../themes/theme.service'
import type { CreateHomepageItemDto, CreateHomepageModuleDto, ReorderDto, UpdateHomepageModuleDto } from './homepage.dto'

type SnapshotModule = Record<string, unknown> & { items?: Array<Record<string, unknown>> }

@Injectable()
export class HomepageService {
  private readonly allowedKeys = new Set<string>([
    'hero_banner', 'ability_method', 'theme_direction', 'weekly_featured',
    'featured_labs', 'maker_projects', 'frontier_news', 'resource_tools',
    'weekly_challenge', 'growth_summary', 'student_activity', 'bottom_action',
  ] satisfies HomepageModuleKey[])

  constructor(
    private readonly prisma: PrismaService,
    private readonly themes: ThemeService,
    private readonly courses: CourseService,
    private readonly labs: LabService,
    private readonly resources: ResourceService,
    private readonly articles: ArticleService,
    private readonly challenges: ChallengeService,
  ) {}

  async adminModules() {
    const modules = await this.prisma.homepageModule.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { items: { orderBy: { sortOrder: 'asc' } } },
    })
    return Promise.all(modules.map(async (module) => ({
      ...module,
      items: await Promise.all(module.items.map(async (item) => ({
        ...item,
        relationValid: await this.isPublishedTarget(item.targetType, item.targetId),
      }))),
    })))
  }

  async preview(): Promise<PublicHomepageDto> {
    const modules = await this.prisma.homepageModule.findMany({
      where: { enabled: true },
      orderBy: { sortOrder: 'asc' },
      include: { items: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
    })
    return this.render(modules, modules[0]?.updatedAt || new Date(), 0)
  }

  async published(): Promise<PublicHomepageDto> {
    const publication = await this.prisma.homepagePublication.findFirst({ orderBy: { version: 'desc' } })
    if (!publication || !Array.isArray(publication.snapshot)) return { modules: [], updatedAt: new Date(0).toISOString(), version: 0 }
    return this.render(publication.snapshot as SnapshotModule[], publication.publishedAt, publication.version)
  }

  async createModule(input: CreateHomepageModuleDto) {
    const module = await this.prisma.homepageModule.create({
      data: {
        moduleKey: input.moduleKey,
        name: input.moduleName,
        moduleType: input.moduleType,
        config: input.config as Prisma.InputJsonValue,
        sortOrder: input.sortOrder,
      },
    })
    await this.createDraft(module.id)
    return module
  }

  async updateModule(id: string, input: UpdateHomepageModuleDto) {
    const { config, ...rest } = input
    const module = await this.prisma.homepageModule.update({
      where: { id },
      data: { ...rest, ...(config ? { config: config as Prisma.InputJsonValue } : {}) },
    })
    await this.createDraft(id)
    return module
  }

  async reorder(input: ReorderDto) {
    await this.prisma.$transaction(input.items.map((item) => this.prisma.homepageModule.update({ where: { id: item.id }, data: { sortOrder: item.sortOrder } })))
    for (const item of input.items) await this.createDraft(item.id)
    return this.adminModules()
  }

  async addItem(moduleId: string, input: CreateHomepageItemDto) {
    const item = await this.prisma.homepageItem.create({ data: { moduleId, ...input } })
    await this.createDraft(moduleId)
    return item
  }

  async reorderItems(moduleId: string, input: ReorderDto) {
    const existing = await this.prisma.homepageItem.findMany({
      where: { moduleId, id: { in: input.items.map((item) => item.id) } },
      select: { id: true },
    })
    if (existing.length !== input.items.length) throw new NotFoundException('推荐内容不存在或不属于当前模块')
    await this.prisma.$transaction(input.items.map((item) => this.prisma.homepageItem.update({
      where: { id: item.id },
      data: { sortOrder: item.sortOrder },
    })))
    await this.createDraft(moduleId)
    return this.adminModules()
  }

  async deleteItem(moduleId: string, id: string) {
    await this.prisma.homepageItem.deleteMany({ where: { id, moduleId } })
    await this.createDraft(moduleId)
    return { deleted: true }
  }

  async publish() {
    return this.prisma.$transaction(async (tx) => {
      const modules = await tx.homepageModule.findMany({
        where: { enabled: true },
        orderBy: { sortOrder: 'asc' },
        include: { items: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } }, _count: { select: { versions: true } } },
      })
      const published = []
      const publishedAt = new Date()
      for (const module of modules) {
        const snapshot = {
          moduleKey: module.moduleKey,
          name: module.name,
          moduleType: module.moduleType,
          enabled: module.enabled,
          sortOrder: module.sortOrder,
          config: module.config,
          items: module.items,
        } as Prisma.InputJsonValue
        let versionId = module.currentDraftVersionId
        if (!versionId || versionId === module.publishedVersionId) {
          versionId = (await tx.homepageModuleVersion.create({
            data: { moduleId: module.id, versionNo: module._count.versions + 1, snapshot },
          })).id
        } else {
          await tx.homepageModuleVersion.update({ where: { id: versionId }, data: { snapshot } })
        }
        const updated = await tx.homepageModule.update({
          where: { id: module.id },
          data: {
            status: 'published',
            publishedAt,
            currentDraftVersionId: versionId,
            publishedVersionId: versionId,
          },
        })
        published.push({ ...updated, items: module.items })
      }
      const latest = await tx.homepagePublication.findFirst({ orderBy: { version: 'desc' } })
      return tx.homepagePublication.create({
        data: { version: (latest?.version || 0) + 1, snapshot: JSON.parse(JSON.stringify(published)) as Prisma.InputJsonValue },
      })
    })
  }

  private async render(modules: SnapshotModule[], updatedAt: Date, version: number): Promise<PublicHomepageDto> {
    const rendered = (await Promise.all(modules
      .filter((module) => module.enabled !== false && this.allowedKeys.has(String(module.moduleKey)))
      .sort((left, right) => Number(left.sortOrder || 0) - Number(right.sortOrder || 0))
      .map(async (module) => ({
        id: String(module.moduleKey),
        moduleKey: String(module.moduleKey) as HomepageModuleKey,
        name: String(module.name || ''),
        sortOrder: Number(module.sortOrder || 0),
        config: module.config && typeof module.config === 'object' && !Array.isArray(module.config) ? module.config as Record<string, unknown> : {},
        items: (await Promise.all((module.items || [])
          .filter((item) => item.enabled !== false)
          .map(async (item) => {
            const resolved = await this.resolve(String(item.targetType), String(item.targetId))
            return resolved && item.titleOverride ? { ...resolved, title: String(item.titleOverride) } : resolved
          })))
          .filter((item) => item !== null),
      }))))
    return { modules: rendered, updatedAt: updatedAt.toISOString(), version }
  }

  private async resolve(targetType: string, targetId: string) {
    try {
      const item = targetType === 'theme' ? await this.themes.detail(targetId, true)
        : targetType === 'course' ? await this.courses.detail(targetId, true)
          : targetType === 'lab' ? await this.labs.detail(targetId, true)
            : targetType === 'resource' ? await this.resources.detail(targetId, true)
              : targetType === 'article' ? await this.articles.detail(targetId, true)
                : targetType === 'challenge' ? await this.challenges.detail(targetId, true)
                  : null
      return item ? { targetType: targetType as HomepageResolvedItemDto['targetType'], slug: item.slug, title: item.title, summary: item.summary, data: item.data } : null
    } catch (error) {
      if (error instanceof NotFoundException) return null
      throw error
    }
  }

  private async isPublishedTarget(targetType: string, targetId: string) {
    return Boolean(await this.resolve(targetType, targetId))
  }

  private async createDraft(moduleId: string) {
    const module = await this.prisma.homepageModule.findUnique({
      where: { id: moduleId },
      include: { items: { orderBy: { sortOrder: 'asc' } }, _count: { select: { versions: true } } },
    })
    if (!module) throw new NotFoundException('首页模块不存在')
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
      return
    }
    const version = await this.prisma.homepageModuleVersion.create({
      data: { moduleId, versionNo: module._count.versions + 1, snapshot },
    })
    await this.prisma.homepageModule.update({ where: { id: moduleId }, data: { currentDraftVersionId: version.id } })
  }
}
