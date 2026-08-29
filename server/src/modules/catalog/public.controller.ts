import { Controller, Get, Param, Query } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CatalogService } from './catalog.service'
import { PageQueryDto } from './catalog.dto'

@Controller()
export class PublicCatalogController {
  constructor(private readonly catalog: CatalogService, private readonly prisma: PrismaService) {}

  @Get('public/homepage')
  async homepage() {
    const publication = await this.prisma.homepagePublication.findFirst({ orderBy: { version: 'desc' } })
    const current = await this.prisma.homepageModule.findMany({
      where: { enabled: true, status: 'published' },
      orderBy: { sortOrder: 'asc' },
      include: { items: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
    })
    const modules = publication && Array.isArray(publication.snapshot)
      ? publication.snapshot as Array<Record<string, unknown> & { items?: Array<Record<string, unknown>> }>
      : current
    const resolved = await Promise.all(modules.map(async (module) => ({
      ...module,
      items: (await Promise.all((Array.isArray(module.items) ? module.items : []).map(async (item: Record<string, unknown>) => ({
        item,
        valid: await this.catalog.isPublishedTarget(String(item.targetType), String(item.targetId)),
      })))).filter((entry) => entry.valid).map((entry) => entry.item),
    })))
    return {
      modules: resolved,
      updatedAt: publication?.publishedAt.toISOString() || current[0]?.updatedAt.toISOString() || new Date().toISOString(),
      version: publication?.version || modules.length,
    }
  }

  @Get('themes')
  listThemes(@Query() query: PageQueryDto) { return this.catalog.list('themes', query, true) }
  @Get('themes/:slug')
  theme(@Param('slug') slug: string) { return this.catalog.detail('themes', slug, true) }
  @Get('courses')
  listCourses(@Query() query: PageQueryDto) { return this.catalog.list('courses', query, true) }
  @Get('courses/:slug')
  course(@Param('slug') slug: string) { return this.catalog.detail('courses', slug, true) }
  @Get('labs')
  listLabs(@Query() query: PageQueryDto) { return this.catalog.list('labs', query, true) }
  @Get('labs/:slug')
  lab(@Param('slug') slug: string) { return this.catalog.detail('labs', slug, true) }
  @Get('resources')
  listResources(@Query() query: PageQueryDto) { return this.catalog.list('resources', query, true) }
  @Get('resources/:slug')
  async resource(@Param('slug') slug: string) {
    const item = await this.catalog.detail('resources', slug, true)
    await this.prisma.$transaction([
      this.prisma.resource.update({ where: { id: item.databaseId }, data: { viewCount: { increment: 1 } } }),
      this.prisma.resourceView.create({ data: { resourceId: item.databaseId } }),
    ])
    return { ...item, views: Number(item.views || 0) + 1 }
  }
  @Get('articles')
  async listArticles(@Query() query: PageQueryDto) {
    await this.catalog.publishScheduledArticles()
    return this.catalog.list('articles', query, true)
  }
  @Get('articles/:slug')
  async article(@Param('slug') slug: string) {
    await this.catalog.publishScheduledArticles()
    const item = await this.catalog.detail('articles', slug, true)
    await this.prisma.$transaction([
      this.prisma.article.update({ where: { id: item.databaseId }, data: { viewCount: { increment: 1 } } }),
      this.prisma.articleView.create({ data: { articleId: item.databaseId } }),
    ])
    return { ...item, views: Number(item.views || 0) + 1 }
  }
  @Get('challenges')
  listChallenges(@Query() query: PageQueryDto) { return this.catalog.list('challenges', query, true) }
  @Get('challenges/:slug')
  challenge(@Param('slug') slug: string) { return this.catalog.detail('challenges', slug, true) }
}
