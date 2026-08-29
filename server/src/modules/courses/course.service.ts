import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { ContentSupportService } from '../../common/content/content-support.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from '../../common/content/page-query.dto'
import type { CreateCourseDto, UpdateCourseDto } from './course.dto'

const dataFields = ['category', 'level', 'cover', 'mode', 'hours', 'durationMinutes', 'certificate']

@Injectable()
export class CourseService {
  constructor(private readonly prisma: PrismaService, private readonly support: ContentSupportService) {}

  private courseData(input: CreateCourseDto | UpdateCourseDto) {
    const data = this.support.pick(input, dataFields)
    if (input.instructorName !== undefined || input.instructorTitle !== undefined) {
      data.instructor = { name: input.instructorName || '', title: input.instructorTitle || '' }
    }
    return data
  }

  private snapshot(snapshot: Prisma.JsonValue | null | undefined) {
    const value = this.support.data(snapshot)
    return {
      title: typeof value.title === 'string' ? value.title : undefined,
      summary: typeof value.summary === 'string' ? value.summary : undefined,
      data: this.support.data((value.data || value.payload) as Prisma.JsonValue),
    }
  }

  async list(query: PageQueryDto, publicOnly = false) {
    const where = this.support.where(query, publicOnly)
    const [items, total] = await this.prisma.$transaction([
      this.prisma.course.findMany({ ...this.support.page(query), where, include: { publishedVersion: true } }),
      this.prisma.course.count({ where }),
    ])
    return {
      items: items.map((item) => {
        const published = publicOnly ? this.snapshot(item.publishedVersion?.snapshot) : null
        return this.support.base({
          ...item,
          title: published?.title || item.title,
          summary: published?.summary || item.summary,
        }, !publicOnly, published?.data || this.support.data(item.payload))
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async detail(value: string, publicOnly = false) {
    const item = await this.prisma.course.findFirst({
      where: { OR: [{ id: value }, { slug: value }], deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
      include: {
        currentDraftVersion: { include: { chapters: { orderBy: { sortOrder: 'asc' }, include: { lessons: { orderBy: { sortOrder: 'asc' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } } } } } },
        publishedVersion: { include: { chapters: { orderBy: { sortOrder: 'asc' }, include: { lessons: { orderBy: { sortOrder: 'asc' }, include: { blocks: { orderBy: { sortOrder: 'asc' } } } } } } } },
        resources: {
          where: publicOnly ? { resource: { status: PublishStatus.published, deletedAt: null } } : {},
          orderBy: { sortOrder: 'asc' },
          include: { resource: true },
        },
        labs: {
          where: publicOnly ? { lab: { status: PublishStatus.published, deletedAt: null } } : {},
          orderBy: { sortOrder: 'asc' },
          include: { lab: true },
        },
      },
    })
    if (!item) throw new NotFoundException('课程不存在')
    const published = publicOnly ? this.snapshot(item.publishedVersion?.snapshot) : null
    return {
      ...this.support.base({
        ...item,
        title: published?.title || item.title,
        summary: published?.summary || item.summary,
      }, !publicOnly, published?.data || this.support.data(item.payload)),
      ...(!publicOnly ? {
        themeId: item.themeId,
        currentDraftVersionId: item.currentDraftVersionId,
        publishedVersionId: item.publishedVersionId,
      } : {}),
      chapters: (publicOnly ? item.publishedVersion : item.currentDraftVersion)?.chapters || [],
      relatedResources: item.resources.map((link) => ({
        ...(!publicOnly ? { id: link.resource.id } : {}),
        slug: link.resource.slug,
        title: link.resource.title,
      })),
      relatedLabs: item.labs.map((link) => ({
        ...(!publicOnly ? { id: link.lab.id } : {}),
        slug: link.lab.slug,
        title: link.lab.title,
      })),
    }
  }

  async create(input: CreateCourseDto, actorId: string) {
    const data = this.courseData(input)
    const item = await this.prisma.$transaction(async (tx) => {
      const course = await tx.course.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          sortOrder: input.sortOrder,
          themeId: input.themeId || null,
          payload: this.support.sanitize(data),
        },
      })
      const version = await tx.courseVersion.create({
        data: { courseId: course.id, versionNo: 1, snapshot: this.support.json({ title: course.title, summary: course.summary, data }) },
      })
      return tx.course.update({ where: { id: course.id }, data: { currentDraftVersionId: version.id } })
    })
    await this.support.audit(actorId, 'create', 'courses', item.id)
    return this.support.base(item, true)
  }

  async update(id: string, input: UpdateCourseDto, actorId: string) {
    const draftId = await this.ensureDraft(id)
    const current = await this.prisma.course.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('课程不存在')
    const data = { ...this.support.data(current.payload), ...this.courseData(input) }
    const item = await this.prisma.course.update({
      where: { id },
      data: {
        ...this.support.pick(input, ['title', 'summary', 'sortOrder', 'themeId']),
        payload: this.support.sanitize(data),
        version: { increment: 1 },
      },
    })
    const draft = await this.prisma.courseVersion.findUnique({ where: { id: draftId } })
    const snapshot = this.support.data(draft?.snapshot)
    await this.prisma.courseVersion.update({
      where: { id: draftId },
      data: { snapshot: this.support.json({ ...snapshot, title: item.title, summary: item.summary, data }) },
    })
    await this.support.audit(actorId, 'update', 'courses', id)
    return this.support.base(item, true)
  }

  async setPublished(id: string, published: boolean, actorId: string) {
    const draftId = published ? await this.ensureDraft(id) : null
    if (published && !draftId) throw new BadRequestException('课程没有可发布草稿版本')
    const item = await this.prisma.course.update({
      where: { id },
      data: published
        ? { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } }
        : { status: PublishStatus.archived, version: { increment: 1 } },
    })
    await this.support.audit(actorId, published ? 'publish' : 'archive', 'courses', id)
    return this.support.base(item, true)
  }

  async ensureDraft(courseId: string) {
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
          snapshot: (source?.snapshot || { title: course.title, summary: course.summary, data: this.support.data(course.payload) }) as Prisma.InputJsonValue,
        },
      })
      for (const chapter of source?.chapters || []) {
        const createdChapter = await tx.courseChapter.create({
          data: { courseVersionId: version.id, title: chapter.title, description: chapter.description, sortOrder: chapter.sortOrder },
        })
        for (const lesson of chapter.lessons) {
          const createdLesson = await tx.courseLesson.create({
            data: {
              chapterId: createdChapter.id,
              title: lesson.title,
              summary: lesson.summary,
              lessonType: lesson.lessonType,
              durationMinutes: lesson.durationMinutes,
              sortOrder: lesson.sortOrder,
            },
          })
          for (const block of lesson.blocks) {
            await tx.lessonBlock.create({
              data: { lessonId: createdLesson.id, blockType: block.blockType, sortOrder: block.sortOrder, content: block.content as Prisma.InputJsonValue },
            })
          }
        }
      }
      await tx.course.update({ where: { id: courseId }, data: { currentDraftVersionId: version.id } })
      return version.id
    })
  }

  async setRelations(courseId: string, resourceIds: string[], labIds: string[]) {
    await this.prisma.$transaction(async (tx) => {
      await tx.courseResource.deleteMany({ where: { courseId } })
      await tx.courseLab.deleteMany({ where: { courseId } })
      for (const [sortOrder, resourceId] of resourceIds.entries()) {
        await tx.courseResource.create({ data: { courseId, resourceId, sortOrder } })
      }
      for (const [sortOrder, labId] of labIds.entries()) {
        await tx.courseLab.create({ data: { courseId, labId, sortOrder } })
      }
    })
    return this.detail(courseId)
  }
}
