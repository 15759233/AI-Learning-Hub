import { BadRequestException, Injectable } from '@nestjs/common'
import type { CommunityBindingInput, LearningContentReferenceDto, LearningContentType } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'

const types: LearningContentType[] = ['theme', 'course', 'lesson', 'lab', 'resource', 'article', 'challenge', 'lab_run']
const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}

@Injectable()
export class ContentReferenceService {
  constructor(private readonly prisma: PrismaService) {}

  /** 每个类型一次查询；标题与摘要只来自已发布快照，绝不解析草稿 payload。 */
  async resolveMany(inputs: CommunityBindingInput[], viewerId: string, strict = false) {
    const result = new Map<string, LearningContentReferenceDto>()
    for (const type of types) {
      const ids = [...new Set(inputs.filter((item) => item.type === type).map((item) => item.id))]
      if (!ids.length) continue
      if (type === 'lesson') {
        const rows = await this.prisma.courseLesson.findMany({
          where: { id: { in: ids }, chapter: { version: { course: { status: 'published', deletedAt: null } } } },
          include: { chapter: { include: { version: { include: { course: true } } } } },
        })
        for (const row of rows) {
          const course = row.chapter.version.course
          if (course.publishedVersionId !== row.chapter.courseVersionId) continue
          result.set(`${type}:${row.id}`, { type, id: row.id, title: row.title, summary: row.summary, route: `/courses/${course.slug}?lesson=${row.id}`, status: 'published' })
        }
        continue
      }
      if (type === 'lab_run') {
        const rows = await this.prisma.labRun.findMany({ where: { id: { in: ids }, userId: viewerId, status: 'submitted', lab: { status: 'published', deletedAt: null } }, include: { lab: { include: { publishedVersion: true } } } })
        for (const row of rows) {
          const snapshot = object(row.lab.publishedVersion?.snapshot)
          result.set(`${type}:${row.id}`, { type, id: row.id, title: `${String(snapshot.title || row.lab.title)} · 已提交成果`, route: `/labs/${row.lab.slug}`, status: 'submitted' })
        }
        continue
      }
      const where = { OR: [{ id: { in: ids } }, { slug: { in: ids } }], status: 'published' as const, deletedAt: null }
      const include = { publishedVersion: true }
      const rows = type === 'theme' ? await this.prisma.theme.findMany({ where, include })
        : type === 'course' ? await this.prisma.course.findMany({ where, include })
          : type === 'lab' ? await this.prisma.lab.findMany({ where, include })
            : type === 'resource' ? await this.prisma.resource.findMany({ where: { ...where, visibility: 'public' }, include })
              : type === 'article' ? await this.prisma.article.findMany({ where, include })
                : await this.prisma.challenge.findMany({ where, include })
      for (const row of rows) {
        if (!row.publishedVersion) continue
        const snapshot = object(row.publishedVersion.snapshot)
        const data = object(snapshot.data || snapshot.payload)
        const routes = { theme: `/topics?theme=${row.slug}`, course: `/courses/${row.slug}`, lab: `/labs/${row.slug}`, resource: `/resources?resource=${row.slug}`, article: `/frontier?article=${row.slug}`, challenge: `/assessments?challenge=${row.slug}` }
        const ref: LearningContentReferenceDto = { type, id: row.id, slug: row.slug, title: String(snapshot.title || row.title), summary: String(snapshot.summary || row.summary), route: routes[type], status: 'published', ...(typeof data.cover === 'string' ? { cover: data.cover } : {}), ...(typeof data.category === 'string' ? { category: data.category } : {}) }
        result.set(`${type}:${row.id}`, ref)
        result.set(`${type}:${row.slug}`, ref)
      }
    }
    if (strict && inputs.some((item) => !result.has(`${item.type}:${item.id}`))) throw new BadRequestException('关联内容不存在、未发布或无权查看；实训成果仅可关联本人已提交的记录')
    return result
  }
}
