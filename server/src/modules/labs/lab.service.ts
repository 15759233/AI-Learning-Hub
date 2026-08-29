import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { ContentSupportService } from '../../common/content/content-support.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from '../../common/content/page-query.dto'
import type { CreateLabDto, UpdateLabDto } from './lab.dto'

const dataFields = ['category', 'level', 'durationMinutes', 'cover', 'objective', 'task', 'hints', 'scoring', 'resultSubmission', 'typeConfig']

@Injectable()
export class LabService {
  constructor(private readonly prisma: PrismaService, private readonly support: ContentSupportService) {}

  private snapshot(snapshot: Prisma.JsonValue | null | undefined) {
    const value = this.support.data(snapshot)
    return {
      title: typeof value.title === 'string' ? value.title : undefined,
      summary: typeof value.summary === 'string' ? value.summary : undefined,
      data: this.support.data((value.data || value.payload) as Prisma.JsonValue),
      steps: Array.isArray(value.steps) ? value.steps : [],
      tools: Array.isArray(value.tools) ? value.tools : [],
      resources: Array.isArray(value.resources) ? value.resources : [],
      labType: typeof value.labType === 'string' ? value.labType : undefined,
    }
  }

  async list(query: PageQueryDto, publicOnly = false) {
    const where = this.support.where(query, publicOnly)
    const [items, total] = await this.prisma.$transaction([
      this.prisma.lab.findMany({ ...this.support.page(query), where, include: { publishedVersion: true } }),
      this.prisma.lab.count({ where }),
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
          labType: published?.labType || item.labType,
        }
      }),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async detail(value: string, publicOnly = false) {
    const item = await this.prisma.lab.findFirst({
      where: { OR: [{ id: value }, { slug: value }], deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        currentDraftVersion: true,
        publishedVersion: true,
        tools: { orderBy: { sortOrder: 'asc' }, include: { tool: true } },
        resources: {
          where: publicOnly ? { resource: { status: PublishStatus.published, deletedAt: null } } : {},
          orderBy: { sortOrder: 'asc' },
          include: { resource: true },
        },
      },
    })
    if (!item) throw new NotFoundException('实训不存在')
    const published = publicOnly ? this.snapshot(item.publishedVersion?.snapshot) : null
    return {
      ...this.support.base({
        ...item,
        title: published?.title || item.title,
        summary: published?.summary || item.summary,
      }, !publicOnly, published?.data || this.support.data(item.payload)),
      labType: published?.labType || item.labType,
      ...(!publicOnly ? { currentDraftVersionId: item.currentDraftVersionId, publishedVersionId: item.publishedVersionId } : {}),
      steps: publicOnly ? published?.steps || [] : item.steps,
      tools: publicOnly
        ? published?.tools || []
        : item.tools.map((binding) => ({
            id: binding.tool.id,
            name: binding.tool.name,
            toolType: binding.tool.toolType,
            description: binding.tool.description,
          })),
      resources: publicOnly
        ? published?.resources || []
        : item.resources.map((link) => ({ id: link.resource.id, slug: link.resource.slug, title: link.resource.title })),
    }
  }

  async create(input: CreateLabDto, actorId: string) {
    const data = this.support.pick(input, dataFields)
    const item = await this.prisma.$transaction(async (tx) => {
      const lab = await tx.lab.create({
        data: {
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          sortOrder: input.sortOrder,
          labType: input.labType,
          payload: this.support.sanitize(data),
        },
      })
      const version = await tx.labVersion.create({
        data: { labId: lab.id, versionNo: 1, snapshot: this.support.json({ title: lab.title, summary: lab.summary, data, labType: lab.labType, steps: [], tools: [], resources: [] }) },
      })
      return tx.lab.update({ where: { id: lab.id }, data: { currentDraftVersionId: version.id } })
    })
    await this.support.audit(actorId, 'create', 'labs', item.id)
    return { ...this.support.base(item, true), labType: item.labType }
  }

  async update(id: string, input: UpdateLabDto, actorId: string) {
    await this.ensureDraft(id)
    const current = await this.prisma.lab.findUnique({ where: { id } })
    if (!current) throw new NotFoundException('实训不存在')
    const data = { ...this.support.data(current.payload), ...this.support.pick(input, dataFields) }
    const item = await this.prisma.lab.update({
      where: { id },
      data: {
        ...this.support.pick(input, ['title', 'summary', 'sortOrder', 'labType']),
        payload: this.support.sanitize(data),
        version: { increment: 1 },
      },
    })
    await this.refreshDraft(id)
    await this.support.audit(actorId, 'update', 'labs', id)
    return { ...this.support.base(item, true), labType: item.labType }
  }

  async setPublished(id: string, published: boolean, actorId: string) {
    const draftId = published ? await this.ensureDraft(id) : null
    if (published) await this.refreshDraft(id)
    const item = await this.prisma.lab.update({
      where: { id },
      data: published
        ? { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } }
        : { status: PublishStatus.archived, version: { increment: 1 } },
    })
    await this.support.audit(actorId, published ? 'publish' : 'archive', 'labs', id)
    return { ...this.support.base(item, true), labType: item.labType }
  }

  async ensureDraft(labId: string) {
    const lab = await this.prisma.lab.findUnique({ where: { id: labId }, include: { currentDraftVersion: true, _count: { select: { versions: true } } } })
    if (!lab) throw new NotFoundException('实训不存在')
    if (lab.currentDraftVersionId && lab.currentDraftVersionId !== lab.publishedVersionId) return lab.currentDraftVersionId
    const version = await this.prisma.labVersion.create({
      data: {
        labId,
        versionNo: lab._count.versions + 1,
        snapshot: (lab.currentDraftVersion?.snapshot || {
          title: lab.title,
          summary: lab.summary,
          data: this.support.data(lab.payload),
          labType: lab.labType,
          steps: [],
          tools: [],
          resources: [],
        }) as Prisma.InputJsonValue,
      },
    })
    await this.prisma.lab.update({ where: { id: labId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }

  async refreshDraft(labId: string) {
    const lab = await this.prisma.lab.findUnique({
      where: { id: labId },
      include: {
        steps: { orderBy: { sortOrder: 'asc' } },
        tools: { orderBy: { sortOrder: 'asc' }, include: { tool: true } },
        resources: { orderBy: { sortOrder: 'asc' }, include: { resource: true } },
      },
    })
    if (!lab?.currentDraftVersionId) throw new NotFoundException('实训草稿不存在')
    await this.prisma.labVersion.update({
      where: { id: lab.currentDraftVersionId },
      data: {
        snapshot: JSON.parse(JSON.stringify({
          title: lab.title,
          summary: lab.summary,
          data: this.support.data(lab.payload),
          labType: lab.labType,
          steps: lab.steps,
          tools: lab.tools.map((binding) => ({
            name: binding.tool.name,
            toolType: binding.tool.toolType,
            description: binding.tool.description,
          })),
          resources: lab.resources
            .filter((link) => link.resource.status === PublishStatus.published && !link.resource.deletedAt)
            .map((link) => ({ slug: link.resource.slug, title: link.resource.title })),
        })) as Prisma.InputJsonValue,
      },
    })
  }
}
