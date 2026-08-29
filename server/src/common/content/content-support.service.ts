import { BadRequestException, Injectable } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from './page-query.dto'

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
}

@Injectable()
export class ContentSupportService {
  constructor(private readonly prisma: PrismaService) {}

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
      ...(includeInternal ? { databaseId: item.id } : {}),
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
