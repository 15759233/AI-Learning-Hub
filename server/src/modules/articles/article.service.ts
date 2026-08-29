import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { ContentSupportService } from '../../common/content/content-support.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from '../../common/content/page-query.dto'
import type { CreateArticleDto, UpdateArticleDto } from './article.dto'

const dataFields = ['tags', 'author', 'cover', 'readMinutes', 'blocks']

@Injectable()
export class ArticleService {
  constructor(private readonly prisma: PrismaService, private readonly support: ContentSupportService) {}

  private snapshot(snapshot: Prisma.JsonValue | null | undefined) {
    const value = this.support.data(snapshot)
    return {
      title: typeof value.title === 'string' ? value.title : undefined,
      summary: typeof value.summary === 'string' ? value.summary : undefined,
      category: typeof value.category === 'string' ? value.category : undefined,
      data: this.support.data((value.data || value.payload) as Prisma.JsonValue),
    }
  }

  async list(query: PageQueryDto, publicOnly = false) {
    const where = this.support.where(query, publicOnly)
    const now = new Date()
    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        ...this.support.page(query),
        where,
        include: {
          publishedVersion: true,
          recommendations: {
            where: {
              enabled: true,
              AND: [
                { OR: [{ startAt: null }, { startAt: { lte: now } }] },
                { OR: [{ endAt: null }, { endAt: { gt: now } }] },
              ],
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
      }),
      this.prisma.article.count({ where }),
    ])
    return {
      items: items.map((item) => {
        const published = publicOnly ? this.snapshot(item.publishedVersion?.snapshot) : null
        return {
          ...this.support.base({
            ...item,
            title: published?.title || item.title,
            summary: published?.summary || item.summary,
          }, !publicOnly, published?.data || this.support.data(item.payload)),
          category: published?.category || item.category,
          views: item.viewCount,
          recommendations: item.recommendations.map(({ positionKey }) => ({ positionKey })),
        }
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async detail(value: string, publicOnly = false) {
    const item = await this.prisma.article.findFirst({
      where: { OR: [{ id: value }, { slug: value }], deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
      include: { currentDraftVersion: true, publishedVersion: true, recommendations: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
    })
    if (!item) throw new NotFoundException('文章不存在')
    const published = publicOnly ? this.snapshot(item.publishedVersion?.snapshot) : null
    return {
      ...this.support.base({
        ...item,
        title: published?.title || item.title,
        summary: published?.summary || item.summary,
      }, !publicOnly, published?.data || this.support.data(item.payload)),
      category: published?.category || item.category,
      views: item.viewCount,
      recommendations: item.recommendations.map(({ positionKey }) => ({ positionKey })),
      ...(!publicOnly ? { scheduledAt: item.scheduledAt?.toISOString() || null } : {}),
    }
  }

  async create(input: CreateArticleDto, actorId: string) {
    const data = this.support.pick(input, dataFields)
    const item = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          sortOrder: input.sortOrder,
          category: input.category,
          payload: this.support.sanitize(data),
        },
      })
      const version = await tx.articleVersion.create({
        data: { articleId: article.id, versionNo: 1, snapshot: this.support.json({ title: article.title, summary: article.summary, category: article.category, data }) },
      })
      return tx.article.update({ where: { id: article.id }, data: { currentDraftVersionId: version.id } })
    })
    await this.support.audit(actorId, 'create', 'articles', item.id)
    return this.support.base(item, true)
  }

  async update(id: string, input: UpdateArticleDto, actorId: string) {
    const draftId = await this.ensureDraft(id)
    const current = await this.prisma.article.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('文章不存在')
    const data = { ...this.support.data(current.payload), ...this.support.pick(input, dataFields) }
    const item = await this.prisma.article.update({
      where: { id },
      data: {
        ...this.support.pick(input, ['title', 'summary', 'sortOrder', 'category']),
        payload: this.support.sanitize(data),
        version: { increment: 1 },
      },
    })
    await this.prisma.articleVersion.update({
      where: { id: draftId },
      data: { snapshot: this.support.json({ title: item.title, summary: item.summary, category: item.category, data }) },
    })
    await this.support.audit(actorId, 'update', 'articles', id)
    return this.support.base(item, true)
  }

  async setPublished(id: string, published: boolean, actorId: string) {
    const draftId = published ? await this.ensureDraft(id) : null
    if (published) await this.refreshDraft(id)
    const item = await this.prisma.$transaction(async (tx) => {
      const article = await tx.article.update({
        where: { id },
        data: published
          ? { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } }
          : { status: PublishStatus.archived, version: { increment: 1 } },
      })
      if (published && draftId) await tx.articlePublication.create({ data: { articleId: id, articleVersionId: draftId } })
      return article
    })
    await this.support.audit(actorId, published ? 'publish' : 'archive', 'articles', id)
    return this.support.base(item, true)
  }

  async ensureDraft(articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId }, include: { currentDraftVersion: true, _count: { select: { versions: true } } } })
    if (!article) throw new NotFoundException('文章不存在')
    if (article.currentDraftVersionId && article.currentDraftVersionId !== article.publishedVersionId) return article.currentDraftVersionId
    const version = await this.prisma.articleVersion.create({
      data: {
        articleId,
        versionNo: article._count.versions + 1,
        snapshot: (article.currentDraftVersion?.snapshot || {
          title: article.title,
          summary: article.summary,
          category: article.category,
          data: this.support.data(article.payload),
        }) as Prisma.InputJsonValue,
      },
    })
    await this.prisma.article.update({ where: { id: articleId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }

  async refreshDraft(articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } })
    if (!article?.currentDraftVersionId) throw new NotFoundException('文章草稿不存在')
    await this.prisma.articleVersion.update({
      where: { id: article.currentDraftVersionId },
      data: {
        snapshot: this.support.json({
          title: article.title,
          summary: article.summary,
          category: article.category,
          data: this.support.data(article.payload),
        }),
      },
    })
  }

  async publishScheduled() {
    const due = await this.prisma.article.findMany({
      where: { scheduledAt: { lte: new Date() }, status: { in: ['draft', 'reviewing'] }, deletedAt: null },
    })
    for (const article of due) {
      const draftId = await this.ensureDraft(article.id)
      await this.refreshDraft(article.id)
      await this.prisma.$transaction(async (tx) => {
        const claimed = await tx.article.updateMany({
          where: { id: article.id, scheduledAt: { lte: new Date() }, status: { in: ['draft', 'reviewing'] } },
          data: { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } },
        })
        if (claimed.count) await tx.articlePublication.create({ data: { articleId: article.id, articleVersionId: draftId } })
      })
    }
  }
}
