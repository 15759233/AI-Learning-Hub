import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { PublishStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import type { AuthUser } from '../auth/auth.types'
import { PageQueryDto } from '../../common/content/page-query.dto'
import { ArticleRecommendationsDto, CreateArticleDto, ScheduleArticleDto, UpdateArticleDto } from './article.dto'
import { ArticleService } from './article.service'

@Controller('admin/articles')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminArticleController {
  constructor(private readonly articles: ArticleService, private readonly prisma: PrismaService) {}
  @Get() @Permissions('article.read') list(@Query() query: PageQueryDto) { return this.articles.list(query) }
  @Post() @Permissions('article.write') create(@Body() input: CreateArticleDto, @CurrentUser() user: AuthUser) { return this.articles.create(input, user.id) }
  @Get(':id') @Permissions('article.read') detail(@Param('id') id: string) { return this.articles.detail(id) }
  @Patch(':id') @Permissions('article.write') update(@Param('id') id: string, @Body() input: UpdateArticleDto, @CurrentUser() user: AuthUser) { return this.articles.update(id, input, user.id) }
  @Post(':id/publish') @Permissions('article.publish') publish(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.articles.setPublished(id, true, user.id) }
  @Post(':id/archive') @Permissions('article.publish') archive(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.articles.setPublished(id, false, user.id) }

  @Post(':id/schedule') @Permissions('article.write')
  async schedule(@Param('id') id: string, @Body() input: ScheduleArticleDto) {
    await this.articles.ensureDraft(id)
    await this.articles.refreshDraft(id)
    return this.prisma.article.update({ where: { id }, data: { scheduledAt: new Date(input.scheduledAt), status: PublishStatus.reviewing } })
  }

  @Put(':id/recommendations') @Permissions('article.write')
  recommendations(@Param('id') articleId: string, @Body() input: ArticleRecommendationsDto) {
    const allowed = new Set(['frontier_hero', 'frontier_weekly', 'frontier_sidebar', 'homepage_news', 'channel_featured'])
    if (input.items.some((item) => !allowed.has(item.positionKey))) throw new NotFoundException('推荐位不存在')
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
}

@Controller('articles')
export class PublicArticleController {
  constructor(private readonly articles: ArticleService) {}
  @Get() list(@Query() query: PageQueryDto) { return this.articles.list(query, true) }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.articles.detail(slug, true) }
}
