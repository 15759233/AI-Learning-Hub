import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { ContentSupportService } from '../../common/content/content-support.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from '../../common/content/page-query.dto'
import type { CreateResourceDto, UpdateResourceDto } from './resource.dto'
import { lockFileReferences } from '../../common/persistence'

const dataFields = ['downloadPermission', 'difficulty', 'tags', 'cover', 'themeId', 'courseId', 'labId']

@Injectable()
export class ResourceService {
  constructor(private readonly prisma: PrismaService, private readonly support: ContentSupportService) {}

  private snapshot(snapshot: Prisma.JsonValue | null | undefined) {
    const value = this.support.data(snapshot)
    return {
      title: typeof value.title === 'string' ? value.title : undefined,
      summary: typeof value.summary === 'string' ? value.summary : undefined,
      category: typeof value.category === 'string' ? value.category : undefined,
      format: typeof value.format === 'string' ? value.format : undefined,
      visibility: typeof value.visibility === 'string' ? value.visibility : undefined,
      fileId: typeof value.fileId === 'string' ? value.fileId : null,
      data: this.support.data((value.data || value.payload) as Prisma.JsonValue),
    }
  }

  async list(query: PageQueryDto, publicOnly = false) {
    const where = this.support.where(query, publicOnly)
    const [items, total] = await this.prisma.$transaction([
      this.prisma.resource.findMany({ ...this.support.page(query), where, include: { publishedVersion: true } }),
      this.prisma.resource.count({ where }),
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
          format: published?.format || item.format,
          visibility: published?.visibility || item.visibility,
          downloads: item.downloadCount,
          views: item.viewCount,
        }
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async detail(value: string, publicOnly = false) {
    const item = await this.prisma.resource.findFirst({
      where: { OR: [{ id: value }, { slug: value }], deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
      include: {
        file: { include: { uploader: { select: { id: true, displayName: true } } } },
        currentDraftVersion: true,
        publishedVersion: true,
        versions: { orderBy: { versionNo: 'desc' } },
      },
    })
    if (!item) throw new NotFoundException('资源不存在')
    const published = publicOnly ? this.snapshot(item.publishedVersion?.snapshot) : null
    const publishedFile = publicOnly && published?.fileId
      ? await this.prisma.fileRecord.findUnique({ where: { id: published.fileId }, include: { uploader: { select: { id: true, displayName: true } } } })
      : null
    const file = publicOnly ? publishedFile : item.file
    return {
      ...this.support.base({
        ...item,
        title: published?.title || item.title,
        summary: published?.summary || item.summary,
      }, !publicOnly, published?.data || this.support.data(item.payload)),
      category: published?.category || item.category,
      format: published?.format || item.format,
      visibility: published?.visibility || item.visibility,
      downloads: item.downloadCount,
      views: item.viewCount,
      file: file ? { id: file.id, name: file.originalName, size: file.size, mimeType: file.mimeType } : null,
      uploadedBy: file?.uploader || null,
      ...(!publicOnly ? {
        currentDraftVersionId: item.currentDraftVersionId,
        publishedVersionId: item.publishedVersionId,
        versions: item.versions.map((version) => ({
          id: version.id,
          versionNo: version.versionNo,
          createdAt: version.createdAt.toISOString(),
          snapshot: version.snapshot,
        })),
      } : {}),
    }
  }

  async create(input: CreateResourceDto, actorId: string) {
    const data = this.support.pick(input, dataFields)
    const item = await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      if (input.fileId && !await tx.fileRecord.count({ where: { id: input.fileId, OR: [{ uploadedBy: actorId }, { resources: { some: {} } }] } })) throw new BadRequestException('资源文件不存在或无权使用')
      const resource = await tx.resource.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          sortOrder: input.sortOrder,
          category: input.category,
          format: input.format,
          visibility: input.visibility,
          fileId: input.fileId || null,
          payload: this.support.sanitize(data),
        },
      })
      const version = await tx.resourceVersion.create({
        data: { resourceId: resource.id, versionNo: 1, snapshot: this.support.json({ title: resource.title, summary: resource.summary, category: resource.category, format: resource.format, visibility: resource.visibility, data, fileId: resource.fileId }) },
      })
      return tx.resource.update({ where: { id: resource.id }, data: { currentDraftVersionId: version.id } })
    })
    await this.syncRelations(item.id, input.courseId, input.labId)
    await this.support.audit(actorId, 'create', 'resources', item.id)
    return this.support.base(item, true)
  }

  async update(id: string, input: UpdateResourceDto, actorId: string) {
    const current = await this.prisma.resource.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('资源不存在')
    const data = { ...this.support.data(current.payload), ...this.support.pick(input, dataFields) }
    const item = await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      if (input.fileId && !await tx.fileRecord.count({ where: { id: input.fileId, OR: [{ uploadedBy: actorId }, { resources: { some: {} } }] } })) throw new BadRequestException('资源文件不存在或无权使用')
      const resource = await tx.resource.update({
        where: { id },
        data: {
          ...this.support.pick(input, ['title', 'summary', 'sortOrder', 'category', 'format', 'visibility', 'fileId']),
          payload: this.support.sanitize(data),
          version: { increment: 1 },
        },
      })
      const versionNo = await tx.resourceVersion.count({ where: { resourceId: id } }) + 1
      const version = await tx.resourceVersion.create({
        data: {
          resourceId: id,
          versionNo,
          snapshot: this.support.json({
            title: resource.title,
            summary: resource.summary,
            category: resource.category,
            format: resource.format,
            visibility: resource.visibility,
            data,
            fileId: resource.fileId,
          }),
        },
      })
      return tx.resource.update({ where: { id }, data: { currentDraftVersionId: version.id } })
    })
    if (input.courseId !== undefined || input.labId !== undefined) await this.syncRelations(id, input.courseId, input.labId)
    await this.support.audit(actorId, 'update', 'resources', id)
    return this.support.base(item, true)
  }

  async setPublished(id: string, published: boolean, actorId: string) {
    const draftId = published ? await this.ensureDraft(id) : null
    const item = await this.prisma.resource.update({
      where: { id },
      data: published
        ? { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } }
        : { status: PublishStatus.archived, version: { increment: 1 } },
    })
    await this.support.audit(actorId, published ? 'publish' : 'archive', 'resources', id)
    return this.support.base(item, true)
  }

  async restoreVersion(id: string, versionId: string, actorId: string) {
    const version = await this.prisma.resourceVersion.findFirst({ where: { id: versionId, resourceId: id } })
    if (!version) throw new NotFoundException('资源版本不存在')
    const snapshot = this.snapshot(version.snapshot)
    await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      const versionNo = await tx.resourceVersion.count({ where: { resourceId: id } }) + 1
      const draft = await tx.resourceVersion.create({
        data: { resourceId: id, versionNo, snapshot: version.snapshot as Prisma.InputJsonValue },
      })
      await tx.resource.update({
        where: { id },
        data: {
          title: snapshot.title || '',
          summary: snapshot.summary || '',
          category: snapshot.category || '',
          format: snapshot.format || '',
          visibility: snapshot.visibility || 'authenticated',
          payload: this.support.sanitize(snapshot.data),
          fileId: snapshot.fileId,
          currentDraftVersionId: draft.id,
          version: { increment: 1 },
        },
      })
    })
    await this.support.audit(actorId, 'restore_version', 'resources', id)
    return this.detail(id)
  }

  private async ensureDraft(resourceId: string) {
    const resource = await this.prisma.resource.findUnique({
      where: { id: resourceId },
      include: { currentDraftVersion: true, _count: { select: { versions: true } } },
    })
    if (!resource) throw new NotFoundException('资源不存在')
    if (resource.currentDraftVersionId && resource.currentDraftVersionId !== resource.publishedVersionId) return resource.currentDraftVersionId
    const version = await this.prisma.resourceVersion.create({
      data: {
        resourceId,
        versionNo: resource._count.versions + 1,
        snapshot: (resource.currentDraftVersion?.snapshot || this.support.json({
          title: resource.title,
          summary: resource.summary,
          category: resource.category,
          format: resource.format,
          visibility: resource.visibility,
          data: this.support.data(resource.payload),
          fileId: resource.fileId,
        })) as Prisma.InputJsonValue,
      },
    })
    await this.prisma.resource.update({ where: { id: resourceId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }

  private async syncRelations(resourceId: string, courseId?: string, labId?: string) {
    await this.prisma.$transaction(async (tx) => {
      if (courseId !== undefined) {
        await tx.courseResource.deleteMany({ where: { resourceId } })
        if (courseId) await tx.courseResource.create({ data: { resourceId, courseId } })
      }
      if (labId !== undefined) {
        await tx.labResource.deleteMany({ where: { resourceId } })
        if (labId) await tx.labResource.create({ data: { resourceId, labId } })
      }
    })
  }
}
