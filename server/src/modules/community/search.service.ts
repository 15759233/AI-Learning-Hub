import { BadRequestException, Injectable } from '@nestjs/common'
import type { CommunitySearchResultDto } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'
import { CommunityPostService, postInclude } from './post.service'
import { CommunityContextService } from './context.service'
import { CommunityVisibilityPolicyService } from './visibility.service'
import { ContentSupportService } from '../../common/content/content-support.service'
import { authorDto, authorInclude } from './community.mapper'
import type { SearchDto } from './community.dto'
@Injectable()
export class CommunitySearchService {
  constructor(private readonly prisma: PrismaService, private readonly posts: CommunityPostService, private readonly context: CommunityContextService, private readonly visibility: CommunityVisibilityPolicyService, private readonly support: ContentSupportService) {}
  async search(userId: string, query: SearchDto): Promise<CommunitySearchResultDto> {
    await this.visibility.viewer(userId)
    const q = query.q.trim(), result: CommunitySearchResultDto = { posts: [], users: [], topics: [], courses: [], labs: [], resources: [], articles: [], nextCursor: null }
    if (!q) return result
    let after = ''
    if (query.cursor) {
      try {
        const parsed = JSON.parse(Buffer.from(query.cursor, 'base64url').toString()) as { q: string; type: string; after: string }
        if (parsed.q !== q || parsed.type !== query.type || typeof parsed.after !== 'string') throw new Error()
        after = parsed.after
      } catch { throw new BadRequestException('搜索游标无效') }
    }
    const take = query.type === 'all' ? 3 : query.limit, selected = (type: string) => query.type === 'all' || query.type === type
    const text = { contains: q, mode: 'insensitive' as const }, id = after ? { gt: after } : undefined
    let next = ''
    const page = <T extends { id: string }>(rows: T[]) => { if (query.type !== 'all' && rows.length > take) next = rows[take - 1].id; return rows.slice(0, take) }
    if (selected('posts')) {
      const rows = await this.prisma.communityPost.findMany({ where: { AND: [await this.visibility.where(userId), { id, OR: [{ title: text }, { plainText: text }] }] }, include: postInclude, orderBy: { id: 'asc' }, take: take + 1 })
      result.posts = await this.posts.mapMany(userId, page(rows))
    }
    if (selected('users')) {
      const excluded = await this.visibility.authorExclusions(userId)
      result.users = page(await this.prisma.user.findMany({ where: { id: { ...id, notIn: excluded.authors }, status: 'active', OR: [{ username: text }, { displayName: text }] }, include: authorInclude, orderBy: { id: 'asc' }, take: take + 1 })).map(authorDto)
    }
    if (selected('topics')) result.topics = page((await this.context.topics(userId)).filter((row) => row.id > after && `${row.name} ${row.description}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.id.localeCompare(b.id)))
    // 仅检索已发布快照，避免草稿标题进入公开搜索；映射复用内容公共基础契约。
    const where = { status: 'published' as const, deletedAt: null, id, publishedVersion: { is: { OR: [{ snapshot: { path: ['title'], string_contains: q, mode: 'insensitive' as const } }, { snapshot: { path: ['summary'], string_contains: q, mode: 'insensitive' as const } }] } } }
    if (selected('courses')) result.courses = page(await this.prisma.course.findMany({ where, include: { publishedVersion: true }, orderBy: { id: 'asc' }, take: take + 1 })).map((row) => { const snapshot = this.support.data(row.publishedVersion?.snapshot); return this.support.base({ ...row, title: String(snapshot.title), summary: String(snapshot.summary || '') }, false, this.support.data(snapshot.data as never)) }) as CommunitySearchResultDto['courses']
    if (selected('labs')) result.labs = page(await this.prisma.lab.findMany({ where, include: { publishedVersion: true }, orderBy: { id: 'asc' }, take: take + 1 })).map((row) => { const snapshot = this.support.data(row.publishedVersion?.snapshot); return { ...this.support.base({ ...row, title: String(snapshot.title), summary: String(snapshot.summary || '') }, false, this.support.data(snapshot.data as never)), labType: row.labType } }) as CommunitySearchResultDto['labs']
    if (selected('resources')) result.resources = page(await this.prisma.resource.findMany({ where: { ...where, AND: [{ publishedVersion: { is: { snapshot: { path: ['visibility'], not: 'private' } } } }] }, include: { publishedVersion: true }, orderBy: { id: 'asc' }, take: take + 1 })).map((row) => { const snapshot = this.support.data(row.publishedVersion?.snapshot); return { ...this.support.base({ ...row, title: String(snapshot.title), summary: String(snapshot.summary || '') }, false, this.support.data(snapshot.data as never)), category: String(snapshot.category || ''), format: String(snapshot.format || ''), visibility: String(snapshot.visibility || 'public'), downloads: row.downloadCount, views: row.viewCount } }) as CommunitySearchResultDto['resources']
    if (selected('articles')) result.articles = page(await this.prisma.article.findMany({ where, include: { publishedVersion: true }, orderBy: { id: 'asc' }, take: take + 1 })).map((row) => { const snapshot = this.support.data(row.publishedVersion?.snapshot); return { ...this.support.base({ ...row, title: String(snapshot.title), summary: String(snapshot.summary || '') }, false, this.support.data(snapshot.data as never)), category: String(snapshot.category || ''), views: row.viewCount, recommendations: [] } }) as CommunitySearchResultDto['articles']
    if (next) result.nextCursor = Buffer.from(JSON.stringify({ q, type: query.type, after: next })).toString('base64url')
    return result
  }
}
