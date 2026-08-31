import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from './page-query.dto'
import type { CatalogContentType } from '@ai-learning-hub/contracts'
import { MediaResolverService, type MediaReadCache } from '../../modules/media/media-resolver.service'
import { lockFileReferences } from '../persistence'
import { catalogTables } from '../../modules/media/media-usage'

export interface ContentRecord {
  id: string
  slug: string
  title: string
  summary: string
  status: PublishStatus
  sortOrder: number
  publishedAt: Date | null
  updatedAt: Date
  payload: Prisma.JsonValue
  coverAssetId?: string | null
  dataOrigin?: string
}

@Injectable()
export class ContentSupportService {
  constructor(private readonly prisma: PrismaService, readonly media: MediaResolverService) {}

  async render(type: CatalogContentType, item: ContentRecord, includeInternal: boolean, data = this.data(item.payload), cache?: MediaReadCache) {
    return this.base(item, includeInternal, await this.media.data(type, item as unknown as Record<string, unknown>, data, !includeInternal, cache))
  }

  async binding(tx: Prisma.TransactionClient, coverAssetId: unknown) {
    await lockFileReferences(tx)
    await this.media.assertBinding(tx, coverAssetId)
  }

  async remove(type: CatalogContentType, id: string, actorId: string) {
    const table = catalogTables.find(([key]) => key === type)![1]
    return this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      const count = await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(table)} SET deleted_at=NOW(),updated_at=NOW(),status='archived',version=version+1 WHERE id=${id} AND deleted_at IS NULL`)
      if (!count) throw new NotFoundException('内容不存在或已删除')
      await tx.auditLog.create({ data: { actorId, action: 'delete', targetType: type, targetId: id } })
      return { deleted: true }
    })
  }

  data(value: Prisma.JsonValue | null | undefined) {
    return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
  }

  sanitize(value: Record<string, unknown>) {
    if (/<script|javascript:|onerror\s*=|onload\s*=/i.test(JSON.stringify(value))) {
      throw new BadRequestException('内容包含不安全脚本')
    }
    return value as Prisma.InputJsonValue
  }

  json(value: unknown) {
    return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue
  }

  pick(input: object, keys: string[]) {
    const source = input as Record<string, unknown>
    return Object.fromEntries(keys.filter((key) => source[key] !== undefined).map((key) => [key, source[key]]))
  }

  base(item: ContentRecord, includeInternal: boolean, data = this.data(item.payload)) {
    return {
      id: item.slug,
      ...(includeInternal ? { databaseId: item.id, dataOrigin: item.dataOrigin || 'admin_created' } : {}),
      slug: item.slug,
      title: item.title,
      summary: item.summary,
      status: item.status,
      sortOrder: item.sortOrder,
      publishedAt: item.publishedAt?.toISOString() || null,
      updatedAt: item.updatedAt.toISOString(),
      data,
    }
  }

  where(query: PageQueryDto, publicOnly: boolean) {
    return {
      deletedAt: null,
      ...(!publicOnly && query.dataOrigin ? { dataOrigin: query.dataOrigin } : {}),
      ...(publicOnly ? { status: PublishStatus.published } : query.status ? { status: query.status } : {}),
      ...(query.keyword ? {
        OR: [
          { title: { contains: query.keyword, mode: 'insensitive' as const } },
          { summary: { contains: query.keyword, mode: 'insensitive' as const } },
        ],
      } : {}),
    }
  }

  page(query: PageQueryDto) {
    return {
      skip: (query.page - 1) * query.pageSize,
      take: query.pageSize,
      orderBy: [{ sortOrder: 'asc' as const }, { updatedAt: 'desc' as const }],
    }
  }

  async audit(actorId: string, action: string, targetType: string, targetId: string) {
    await this.prisma.auditLog.create({ data: { actorId, action, targetType, targetId } })
  }
}
