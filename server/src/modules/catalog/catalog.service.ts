import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { LabType, Prisma, PublishStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { CreateCatalogDto, PageQueryDto, UpdateCatalogDto } from './catalog.dto'

export type CatalogKind = 'themes' | 'courses' | 'labs' | 'resources' | 'articles' | 'challenges'

const publicItem = (item: {
  id: string; slug: string; title: string; summary: string; status: PublishStatus; sortOrder: number;
  publishedAt: Date | null; updatedAt: Date; payload: Prisma.JsonValue
}) => ({
  id: item.slug,
  databaseId: item.id,
  slug: item.slug,
  title: item.title,
  description: item.summary,
  summary: item.summary,
  status: item.status,
  sortOrder: item.sortOrder,
  publishedAt: item.publishedAt?.toISOString() || null,
  updatedAt: item.updatedAt.toISOString(),
  ...(item.payload && typeof item.payload === 'object' && !Array.isArray(item.payload) ? item.payload : {}),
})

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  private sanitize(payload: Record<string, unknown>) {
    const text = JSON.stringify(payload)
    if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(text)) throw new BadRequestException('内容包含不安全脚本')
    return payload as Prisma.InputJsonValue
  }

  private where(query: PageQueryDto, publicOnly = false) {
    return {
      deletedAt: null,
      ...(publicOnly ? { status: PublishStatus.published } : query.status ? { status: query.status as PublishStatus } : {}),
      ...(query.keyword ? { OR: [{ title: { contains: query.keyword, mode: 'insensitive' as const } }, { summary: { contains: query.keyword, mode: 'insensitive' as const } }] } : {}),
    }
  }

  async list(kind: CatalogKind, query: PageQueryDto, publicOnly = false) {
    const skip = (query.page - 1) * query.pageSize
    const where = this.where(query, publicOnly)
    const options = { where, skip, take: query.pageSize, orderBy: [{ sortOrder: 'asc' as const }, { updatedAt: 'desc' as const }] }
    switch (kind) {
      case 'themes': {
        const [items, total] = await this.prisma.$transaction([
          this.prisma.theme.findMany({
            ...options,
            include: { paths: { where: publicOnly ? { status: PublishStatus.published } : {}, orderBy: { sortOrder: 'asc' }, include: { stages: { orderBy: { sortOrder: 'asc' }, include: { contents: true } } } } },
          }),
          this.prisma.theme.count({ where }),
        ])
        return { items: items.map((item) => ({ ...publicItem(item), paths: item.paths })), page: query.page, pageSize: query.pageSize, total }
      }
      case 'courses': {
        const [items, total] = await this.prisma.$transaction([
          this.prisma.course.findMany({ ...options, include: { publishedVersion: true } }),
          this.prisma.course.count({ where }),
        ])
        return {
          items: items.map((item) => {
            const snapshot = publicOnly && item.publishedVersion?.snapshot && typeof item.publishedVersion.snapshot === 'object' && !Array.isArray(item.publishedVersion.snapshot)
              ? item.publishedVersion.snapshot as Record<string, unknown>
              : {}
            return publicItem({
              ...item,
              title: String(snapshot.title || item.title),
              summary: String(snapshot.summary || item.summary),
            })
          }),
          page: query.page,
          pageSize: query.pageSize,
          total,
        }
      }
      case 'labs': {
        const [items, total] = await this.prisma.$transaction([this.prisma.lab.findMany({ ...options, include: { publishedVersion: true } }), this.prisma.lab.count({ where })])
        return {
          items: items.map((item) => {
            const snapshot = publicOnly && item.publishedVersion?.snapshot && typeof item.publishedVersion.snapshot === 'object' && !Array.isArray(item.publishedVersion.snapshot)
              ? item.publishedVersion.snapshot as Record<string, unknown>
              : {}
            return {
              ...publicItem({
                ...item,
                title: String(snapshot.title || item.title),
                summary: String(snapshot.summary || item.summary),
                payload: (snapshot.payload || item.payload) as Prisma.JsonValue,
              }),
              labType: item.labType,
            }
          }),
          page: query.page,
          pageSize: query.pageSize,
          total,
        }
      }
      case 'resources': {
        const [items, total] = await this.prisma.$transaction([this.prisma.resource.findMany(options), this.prisma.resource.count({ where })])
        return {
          items: items.map((item) => ({
            ...publicItem(item),
            category: item.category,
            format: item.format,
            visibility: item.visibility,
            fileId: item.fileId,
            downloads: item.downloadCount,
            views: item.viewCount,
          })),
          page: query.page,
          pageSize: query.pageSize,
          total,
        }
      }
      case 'articles': {
        const now = new Date()
        const [items, total] = await this.prisma.$transaction([
          this.prisma.article.findMany({
            ...options,
            include: {
              publishedVersion: true,
              recommendations: { where: { enabled: true, AND: [{ OR: [{ startAt: null }, { startAt: { lte: now } }] }, { OR: [{ endAt: null }, { endAt: { gt: now } }] }] }, orderBy: { sortOrder: 'asc' } },
            },
          }),
          this.prisma.article.count({ where }),
        ])
        return {
          items: items.map((item) => {
            const snapshot = publicOnly && item.publishedVersion?.snapshot && typeof item.publishedVersion.snapshot === 'object' && !Array.isArray(item.publishedVersion.snapshot)
              ? item.publishedVersion.snapshot as Record<string, unknown>
              : {}
            return {
              ...publicItem({
                ...item,
                title: String(snapshot.title || item.title),
                summary: String(snapshot.summary || item.summary),
                payload: (snapshot.payload || item.payload) as Prisma.JsonValue,
              }),
              category: String(snapshot.category || item.category),
              views: item.viewCount,
              heatScore: item.heatScore,
              recommendations: item.recommendations,
            }
          }),
          page: query.page,
          pageSize: query.pageSize,
          total,
        }
      }
      case 'challenges': {
        const [items, total] = await this.prisma.$transaction([this.prisma.challenge.findMany(options), this.prisma.challenge.count({ where })])
        return { items: items.map(publicItem), page: query.page, pageSize: query.pageSize, total }
      }
    }
  }

  async detail(kind: CatalogKind, slugOrId: string, publicOnly = false) {
    const where = slugOrId.includes('-') ? { slug: slugOrId } : { id: slugOrId }
    let item: any
    switch (kind) {
      case 'themes': item = await this.prisma.theme.findFirst({
        where: { ...where, deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
        include: { paths: { where: publicOnly ? { status: PublishStatus.published } : {}, orderBy: { sortOrder: 'asc' }, include: { stages: { orderBy: { sortOrder: 'asc' }, include: { contents: true } } } } },
      }); break
      case 'courses': item = await this.prisma.course.findFirst({
        where: { ...where, deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
        include: {
          currentDraftVersion: { include: { chapters: { orderBy: { sortOrder: 'asc' }, include: { lessons: { orderBy: { sortOrder: 'asc' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } } } } } },
          publishedVersion: { include: { chapters: { orderBy: { sortOrder: 'asc' }, include: { lessons: { orderBy: { sortOrder: 'asc' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } } } } } },
        },
      }); break
      case 'labs': item = await this.prisma.lab.findFirst({
        where: { ...where, deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
        include: { steps: { orderBy: { sortOrder: 'asc' } }, currentDraftVersion: true, publishedVersion: true },
      }); break
      case 'resources': item = await this.prisma.resource.findFirst({ where: { ...where, deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) } }); break
      case 'articles': item = await this.prisma.article.findFirst({
        where: { ...where, deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
        include: { currentDraftVersion: true, publishedVersion: true, recommendations: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
      }); break
      case 'challenges': item = await this.prisma.challenge.findFirst({ where: { ...where, deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) } }); break
    }
    if (!item) throw new NotFoundException('内容不存在')
    const snapshot = publicOnly && ['courses', 'labs', 'articles'].includes(kind) && item.publishedVersion?.snapshot && typeof item.publishedVersion.snapshot === 'object' && !Array.isArray(item.publishedVersion.snapshot)
      ? item.publishedVersion.snapshot as Record<string, unknown>
      : {}
    return {
      ...publicItem(Object.keys(snapshot).length
        ? {
            ...item,
            title: String(snapshot.title || item.title),
            summary: String(snapshot.summary || item.summary),
            payload: (snapshot.payload || item.payload) as Prisma.JsonValue,
          }
        : item),
      ...(kind === 'themes' ? { paths: item.paths } : {}),
      ...(kind === 'courses' ? {
        themeId: item.themeId,
        currentDraftVersionId: item.currentDraftVersionId,
        publishedVersionId: item.publishedVersionId,
        chapters: (publicOnly ? item.publishedVersion : item.currentDraftVersion)?.chapters || [],
      } : {}),
      ...(kind === 'labs' ? {
        labType: item.labType,
        currentDraftVersionId: item.currentDraftVersionId,
        publishedVersionId: item.publishedVersionId,
        stepsDetail: publicOnly && Array.isArray(snapshot.steps) ? snapshot.steps : item.steps,
      } : {}),
      ...(kind === 'resources' ? {
        category: item.category,
        format: item.format,
        visibility: item.visibility,
        fileId: item.fileId,
        downloads: item.downloadCount,
        views: item.viewCount,
      } : {}),
      ...(kind === 'articles' ? { category: item.category, views: item.viewCount, heatScore: item.heatScore, recommendations: item.recommendations } : {}),
      ...(kind === 'challenges' ? {
        challengeType: item.challengeType,
        targetScore: item.targetScore,
        rewardPoints: item.rewardPoints,
      } : {}),
    }
  }

  async create(kind: CatalogKind, input: CreateCatalogDto, actorId: string) {
    const common = { slug: input.slug, title: input.title, summary: input.summary, sortOrder: input.sortOrder, payload: this.sanitize(input.payload) }
    let item: any
    switch (kind) {
      case 'themes': item = await this.prisma.$transaction(async (tx) => {
        const theme = await tx.theme.create({ data: common })
        await tx.themeVersion.create({ data: { themeId: theme.id, versionNo: 1, snapshot: { title: theme.title, summary: theme.summary, payload: theme.payload } } })
        return theme
      }); break
      case 'courses': item = await this.prisma.$transaction(async (tx) => {
        const course = await tx.course.create({ data: common })
        const version = await tx.courseVersion.create({
          data: { courseId: course.id, versionNo: 1, snapshot: { title: course.title, summary: course.summary, payload: input.payload } as Prisma.InputJsonValue },
        })
        return tx.course.update({ where: { id: course.id }, data: { currentDraftVersionId: version.id } })
      }); break
      case 'labs': item = await this.prisma.$transaction(async (tx) => {
        const lab = await tx.lab.create({ data: { ...common, labType: (input.payload.labType as LabType) || LabType.project } })
        const version = await tx.labVersion.create({
          data: { labId: lab.id, versionNo: 1, snapshot: { title: lab.title, summary: lab.summary, payload: input.payload, steps: [] } as Prisma.InputJsonValue },
        })
        return tx.lab.update({ where: { id: lab.id }, data: { currentDraftVersionId: version.id } })
      }); break
      case 'resources': item = await this.prisma.$transaction(async (tx) => {
        const resource = await tx.resource.create({
          data: {
            ...common,
            category: String(input.payload.category || '学习手册'),
            format: String(input.payload.format || 'PDF'),
            visibility: String(input.payload.visibility || 'public'),
            fileId: typeof input.payload.fileId === 'string' ? input.payload.fileId : null,
          },
        })
        await tx.resourceVersion.create({ data: { resourceId: resource.id, versionNo: 1, snapshot: { title: resource.title, summary: resource.summary, payload: resource.payload } } })
        return resource
      }); break
      case 'articles': item = await this.prisma.$transaction(async (tx) => {
        const article = await tx.article.create({ data: { ...common, category: String(input.payload.category || '大模型') } })
        const version = await tx.articleVersion.create({
          data: { articleId: article.id, versionNo: 1, snapshot: { title: article.title, summary: article.summary, category: article.category, payload: input.payload } as Prisma.InputJsonValue },
        })
        return tx.article.update({ where: { id: article.id }, data: { currentDraftVersionId: version.id } })
      }); break
      case 'challenges': item = await this.prisma.challenge.create({ data: common }); break
    }
    await this.audit(actorId, 'create', kind, item.id)
    return publicItem(item)
  }

  async update(kind: CatalogKind, id: string, input: UpdateCatalogDto, actorId: string) {
    if (kind === 'courses') await this.ensureCourseDraft(id)
    if (kind === 'labs') await this.ensureLabDraft(id)
    if (kind === 'articles') await this.ensureArticleDraft(id)
    const data: any = {
      ...input,
      ...(input.payload ? { payload: this.sanitize(input.payload) } : {}),
      ...(kind === 'resources' && input.payload ? {
        ...(typeof input.payload.fileId === 'string' ? { fileId: input.payload.fileId } : {}),
        ...(typeof input.payload.category === 'string' ? { category: input.payload.category } : {}),
        ...(typeof input.payload.format === 'string' ? { format: input.payload.format } : {}),
        ...(typeof input.payload.visibility === 'string' ? { visibility: input.payload.visibility } : {}),
      } : {}),
      version: { increment: 1 },
    }
    let item: any
    switch (kind) {
      case 'themes': item = await this.prisma.theme.update({ where: { id }, data }); break
      case 'courses': item = await this.prisma.course.update({ where: { id }, data }); break
      case 'labs': item = await this.prisma.lab.update({ where: { id }, data }); break
      case 'resources': item = await this.prisma.resource.update({ where: { id }, data }); break
      case 'articles': item = await this.prisma.article.update({ where: { id }, data }); break
      case 'challenges': item = await this.prisma.challenge.update({ where: { id }, data }); break
    }
    if (kind === 'courses' && item.currentDraftVersionId) {
      const draft = await this.prisma.courseVersion.findUnique({ where: { id: item.currentDraftVersionId } })
      const snapshot = draft?.snapshot && typeof draft.snapshot === 'object' && !Array.isArray(draft.snapshot)
        ? draft.snapshot as Record<string, unknown>
        : {}
      await this.prisma.courseVersion.update({
        where: { id: item.currentDraftVersionId },
        data: { snapshot: { ...snapshot, title: item.title, summary: item.summary, payload: item.payload } },
      })
    }
    if (kind === 'labs') await this.refreshLabDraft(id)
    if (kind === 'articles') await this.refreshArticleDraft(id)
    if (kind === 'themes') {
      const versionNo = await this.prisma.themeVersion.count({ where: { themeId: id } }) + 1
      await this.prisma.themeVersion.create({ data: { themeId: id, versionNo, snapshot: { title: item.title, summary: item.summary, payload: item.payload } } })
    }
    if (kind === 'resources') {
      const versionNo = await this.prisma.resourceVersion.count({ where: { resourceId: id } }) + 1
      await this.prisma.resourceVersion.create({ data: { resourceId: id, versionNo, snapshot: { title: item.title, summary: item.summary, payload: item.payload } } })
    }
    await this.audit(actorId, 'update', kind, id)
    return publicItem(item)
  }

  async publish(kind: CatalogKind, id: string, actorId: string) {
    const data = { status: PublishStatus.published, publishedAt: new Date(), version: { increment: 1 } }
    let item: any
    switch (kind) {
      case 'themes': item = await this.prisma.theme.update({ where: { id }, data }); break
      case 'courses': {
        const course = await this.prisma.course.findUnique({ where: { id } })
        if (!course?.currentDraftVersionId) throw new BadRequestException('课程没有可发布草稿版本')
        item = await this.prisma.course.update({
          where: { id },
          data: { ...data, publishedVersionId: course.currentDraftVersionId },
        })
        break
      }
      case 'labs': {
        const draftId = await this.ensureLabDraft(id)
        await this.refreshLabDraft(id)
        item = await this.prisma.lab.update({ where: { id }, data: { ...data, publishedVersionId: draftId } })
        break
      }
      case 'resources': item = await this.prisma.resource.update({ where: { id }, data }); break
      case 'articles': {
        const draftId = await this.ensureArticleDraft(id)
        await this.refreshArticleDraft(id)
        item = await this.prisma.article.update({ where: { id }, data: { ...data, publishedVersionId: draftId } })
        break
      }
      case 'challenges': item = await this.prisma.challenge.update({ where: { id }, data }); break
    }
    if (kind === 'articles' && item.publishedVersionId) {
      await this.prisma.articlePublication.create({ data: { articleId: id, articleVersionId: item.publishedVersionId } })
    }
    await this.audit(actorId, 'publish', kind, id)
    return publicItem(item)
  }

  async archive(kind: CatalogKind, id: string, actorId: string) {
    const data = { status: PublishStatus.archived, version: { increment: 1 } }
    let item: any
    switch (kind) {
      case 'themes': item = await this.prisma.theme.update({ where: { id }, data }); break
      case 'courses': item = await this.prisma.course.update({ where: { id }, data }); break
      case 'labs': item = await this.prisma.lab.update({ where: { id }, data }); break
      case 'resources': item = await this.prisma.resource.update({ where: { id }, data }); break
      case 'articles': item = await this.prisma.article.update({ where: { id }, data }); break
      case 'challenges': item = await this.prisma.challenge.update({ where: { id }, data }); break
    }
    await this.audit(actorId, 'archive', kind, id)
    return publicItem(item)
  }

  private async audit(actorId: string, action: string, targetType: string, targetId: string) {
    await this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId } })
  }

  async ensureCourseDraft(courseId: string) {
    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        currentDraftVersion: { include: { chapters: { orderBy: { sortOrder: 'asc' }, include: { lessons: { orderBy: { sortOrder: 'asc' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } } } } } },
        _count: { select: { versions: true } },
      },
    })
    if (!course) throw new NotFoundException('课程不存在')
    if (course.currentDraftVersionId && course.currentDraftVersionId !== course.publishedVersionId) return course.currentDraftVersionId
    return this.prisma.$transaction(async (tx) => {
      const source = course.currentDraftVersion
      const version = await tx.courseVersion.create({
        data: {
          courseId,
          versionNo: course._count.versions + 1,
          snapshot: (source?.snapshot || { title: course.title, summary: course.summary }) as Prisma.InputJsonValue,
        },
      })
      for (const chapter of source?.chapters || []) {
        const newChapter = await tx.courseChapter.create({
          data: { courseVersionId: version.id, title: chapter.title, description: chapter.description, sortOrder: chapter.sortOrder },
        })
        for (const lesson of chapter.lessons) {
          const newLesson = await tx.courseLesson.create({
            data: {
              chapterId: newChapter.id,
              title: lesson.title,
              summary: lesson.summary,
              lessonType: lesson.lessonType,
              durationMinutes: lesson.durationMinutes,
              sortOrder: lesson.sortOrder,
            },
          })
          for (const block of lesson.blocks) {
            await tx.lessonBlock.create({
              data: { lessonId: newLesson.id, blockType: block.blockType, sortOrder: block.sortOrder, content: block.content as Prisma.InputJsonValue },
            })
          }
        }
      }
      await tx.course.update({ where: { id: courseId }, data: { currentDraftVersionId: version.id } })
      return version.id
    })
  }

  async ensureLabDraft(labId: string) {
    const lab = await this.prisma.lab.findUnique({ where: { id: labId }, include: { currentDraftVersion: true, _count: { select: { versions: true } } } })
    if (!lab) throw new NotFoundException('实训不存在')
    if (lab.currentDraftVersionId && lab.currentDraftVersionId !== lab.publishedVersionId) return lab.currentDraftVersionId
    const version = await this.prisma.labVersion.create({
      data: {
        labId,
        versionNo: lab._count.versions + 1,
        snapshot: (lab.currentDraftVersion?.snapshot || { title: lab.title, summary: lab.summary, payload: lab.payload, steps: [] }) as Prisma.InputJsonValue,
      },
    })
    await this.prisma.lab.update({ where: { id: labId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }

  async refreshLabDraft(labId: string) {
    const lab = await this.prisma.lab.findUnique({ where: { id: labId }, include: { steps: { orderBy: { sortOrder: 'asc' } } } })
    if (!lab?.currentDraftVersionId) throw new NotFoundException('实训草稿不存在')
    await this.prisma.labVersion.update({
      where: { id: lab.currentDraftVersionId },
      data: {
        snapshot: JSON.parse(JSON.stringify({ title: lab.title, summary: lab.summary, payload: lab.payload, labType: lab.labType, steps: lab.steps })) as Prisma.InputJsonValue,
      },
    })
  }

  async ensureArticleDraft(articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId }, include: { currentDraftVersion: true, _count: { select: { versions: true } } } })
    if (!article) throw new NotFoundException('文章不存在')
    if (article.currentDraftVersionId && article.currentDraftVersionId !== article.publishedVersionId) return article.currentDraftVersionId
    const version = await this.prisma.articleVersion.create({
      data: {
        articleId,
        versionNo: article._count.versions + 1,
        snapshot: (article.currentDraftVersion?.snapshot || { title: article.title, summary: article.summary, category: article.category, payload: article.payload }) as Prisma.InputJsonValue,
      },
    })
    await this.prisma.article.update({ where: { id: articleId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }

  async refreshArticleDraft(articleId: string) {
    const article = await this.prisma.article.findUnique({ where: { id: articleId } })
    if (!article?.currentDraftVersionId) throw new NotFoundException('文章草稿不存在')
    await this.prisma.articleVersion.update({
      where: { id: article.currentDraftVersionId },
      data: { snapshot: { title: article.title, summary: article.summary, category: article.category, payload: article.payload } as Prisma.InputJsonValue },
    })
  }

  async publishScheduledArticles() {
    const due = await this.prisma.article.findMany({ where: { scheduledAt: { lte: new Date() }, status: { in: ['draft', 'reviewing'] }, deletedAt: null } })
    for (const article of due) {
      const draftId = await this.ensureArticleDraft(article.id)
      await this.refreshArticleDraft(article.id)
      await this.prisma.article.update({
        where: { id: article.id },
        data: { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } },
      })
      await this.prisma.articlePublication.create({ data: { articleId: article.id, articleVersionId: draftId } })
    }
  }

  async isPublishedTarget(targetType: string, targetId: string) {
    const where = { id: targetId, status: PublishStatus.published, deletedAt: null }
    switch (targetType) {
      case 'theme': return !!await this.prisma.theme.findFirst({ where, select: { id: true } })
      case 'course': return !!await this.prisma.course.findFirst({ where, select: { id: true } })
      case 'lab': return !!await this.prisma.lab.findFirst({ where, select: { id: true } })
      case 'resource': return !!await this.prisma.resource.findFirst({ where, select: { id: true } })
      case 'article': return !!await this.prisma.article.findFirst({ where, select: { id: true } })
      case 'challenge': return !!await this.prisma.challenge.findFirst({ where, select: { id: true } })
      default: return false
    }
  }
}
