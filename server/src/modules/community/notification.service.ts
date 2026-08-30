import { Injectable, NotFoundException } from '@nestjs/common'
import type { CommunityNotificationDto } from '@ai-learning-hub/contracts'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { authorDto, authorInclude } from './community.mapper'
import { CommunityVisibilityPolicyService } from './visibility.service'

@Injectable()
export class CommunityNotificationService {
  constructor(private readonly prisma: PrismaService, private readonly visibility: CommunityVisibilityPolicyService) {}
  async send(recipientId: string, actorId: string, type: CommunityNotificationDto['type'], entityType: string, entityId: string, tx: Prisma.TransactionClient = this.prisma) {
    if (recipientId === actorId) return
    const day = new Date().toISOString().slice(0, 13)
    const dedupeKey = `${recipientId}:${type}:${entityType}:${entityId}:${day}`
    await tx.userNotification.createMany({ data: [{ recipientId, actorId, notificationType: type, entityType, entityId, dedupeKey, actorIds: [actorId] }], skipDuplicates: true })
    await tx.userNotification.updateMany({ where: { dedupeKey, NOT: { actorIds: { has: actorId } } }, data: { actorId, actorIds: { push: actorId }, readAt: null } })
  }
  async list(userId: string) {
    await this.visibility.viewer(userId)
    const feedback = await this.visibility.authorExclusions(userId)
    const rows = await this.prisma.userNotification.findMany({ where: { recipientId: userId, NOT: { actorId: { in: feedback.authors } } }, orderBy: { createdAt: 'desc' }, take: 100 })
    const [authors, posts, notices] = await Promise.all([
      this.prisma.user.findMany({ where: { id: { in: rows.flatMap((row) => row.actorIds), notIn: feedback.authors }, status: 'active' }, include: authorInclude }),
      this.prisma.communityPost.findMany({ where: { AND: [await this.visibility.where(userId), { id: { in: rows.filter((row) => row.entityType === 'post').map((row) => row.entityId) } }] }, select: { id: true } }),
      this.prisma.notification.findMany({ where: { status: 'published', audience: { in: ['all', 'student'] } }, include: { reads: { where: { userId } } }, orderBy: { publishedAt: 'desc' }, take: 20 }),
    ])
    const visibleIds = new Set(posts.map((row) => row.id))
    const authorMap = new Map(authors.map((row) => [row.id, authorDto(row)]))
    const labels: Record<string, string> = { comment: '回答了你的动态', reply: '回复了你的评论', like: '赞了你的内容', useful: '认为你的内容有帮助', answer_accepted: '采纳了你的回答', follow: '关注了你', mention: '提到了你', official: '发布了学习提醒', moderation: '你的内容有新的处理结果' }
    const items: CommunityNotificationDto[] = rows.filter((row) => row.notificationType === 'moderation' || (!row.actorId || authorMap.has(row.actorId)) && (row.entityType !== 'post' || visibleIds.has(row.entityId))).map((row) => ({
      id: row.id, type: row.notificationType as CommunityNotificationDto['type'], actor: row.actorId ? authorMap.get(row.actorId) || null : null,
      entityType: row.entityType, entityId: row.entityId, text: `${row.actorIds.filter((id) => authorMap.has(id)).length > 1 ? `${row.actorIds.filter((id) => authorMap.has(id)).length} 位同学` : ''}${labels[row.notificationType] || '有新的社区互动'}`,
      count: row.actorIds.filter((id) => authorMap.has(id)).length, readAt: row.readAt?.toISOString() || null, createdAt: row.createdAt.toISOString(), source: 'community',
    }))
    items.push(...notices.map((row): CommunityNotificationDto => ({ id: row.id, type: 'official', actor: null, entityType: 'notification', entityId: row.id, text: `${row.title}：${row.content}`, count: 1, readAt: row.reads[0]?.readAt.toISOString() || null, createdAt: row.createdAt.toISOString(), source: 'platform' })))
    return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }
  async read(userId: string, id?: string) {
    await this.visibility.viewer(userId)
    if (!id) {
      await this.prisma.userNotification.updateMany({ where: { recipientId: userId, readAt: null }, data: { readAt: new Date() } })
      const notices = await this.prisma.notification.findMany({ where: { status: 'published', audience: { in: ['all', 'student'] } }, select: { id: true } })
      await this.prisma.notificationRead.createMany({ data: notices.map((row) => ({ notificationId: row.id, userId })), skipDuplicates: true })
      return { read: true }
    }
    const updated = await this.prisma.userNotification.updateMany({ where: { id, recipientId: userId }, data: { readAt: new Date() } })
    if (!updated.count) {
      const notice = await this.prisma.notification.findFirst({ where: { id, status: 'published', audience: { in: ['all', 'student'] } } })
      if (!notice) throw new NotFoundException('通知不存在')
      await this.prisma.notificationRead.upsert({ where: { notificationId_userId: { notificationId: id, userId } }, update: {}, create: { notificationId: id, userId } })
    }
    return { read: true }
  }
}
