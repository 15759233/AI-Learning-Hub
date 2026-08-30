import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import { json } from '../community/community.mapper'
import { createHash } from 'node:crypto'

export const signalWeights: Record<string, number> = {
  community_feed_impression: 0.05, community_dwell: 0.1, community_post_click: 0.3, community_post_expand: 0.4,
  community_like_add: 1, community_useful_add: 3, community_bookmark_add: 3, community_comment_create: 2,
  community_reply_create: 2, community_user_follow: 4, community_topic_follow: 4, community_post_publish: 2,
  community_to_course: 4, community_to_lab: 5, community_to_resource: 3, community_to_article: 2,
  community_to_challenge: 4, community_course_started: 6, community_lab_started: 7,
  community_hide: -5, community_not_interested: -8, community_report: -4, community_binding_click: 2,
}
type Affinity = Record<string, number>
@Injectable()
export class SignalsService {
  constructor(private readonly prisma: PrismaService) {}
  async record(userId: string, eventType: string, targetType: string, targetId: string, payload: Record<string, unknown> = {}, tx: Prisma.TransactionClient = this.prisma, context: { requestId?: string; sessionId?: string; position?: number } = {}) {
    await tx.activityEvent.create({ data: { userId, eventType, targetType, targetId, surface: 'community', ...context, payload: json(payload) } })
  }
  async learningConversion(tx: Prisma.TransactionClient, userId: string, type: 'course' | 'lab', id: string) {
    const source = await tx.activityEvent.findFirst({ where: { userId, eventType: `community_to_${type}`, occurredAt: { gte: new Date(Date.now() - 86400000) }, payload: { path: ['bindingKeys'], array_contains: [`${type}:${id}`] } }, orderBy: { occurredAt: 'desc' } })
    if (source?.targetId) await tx.activityEvent.upsert({ where: { id: `learning-conversion-${source.id}` }, update: {}, create: { id: `learning-conversion-${source.id}`, userId, surface: 'community', eventType: `community_${type}_started`, targetType: 'post', targetId: source.targetId, requestId: source.requestId, payload: source.payload as Prisma.InputJsonValue } })
  }
  async achievementDraft(tx: Prisma.TransactionClient, userId: string, type: 'course' | 'lab' | 'challenge', targetId: string, eventId: string) {
    const profile = await tx.communityProfile.findUnique({ where: { userId } })
    if (!profile?.allowAchievementDrafts) return
    const id = `achievement-${createHash('sha256').update(`${userId}:${type}:${eventId}`).digest('hex').slice(0, 32)}`
    const title = type === 'lab' ? '完成一次实训，记录我的收获' : type === 'course' ? '完成一门课程，回顾学习收获' : '完成学习挑战，整理下一步计划'
    const text = '这是一份仅本人可见的学习成就草稿。请补充你学到的知识、验证方法与下一步计划，确认不包含隐私后再主动发布。'
    await tx.communityPost.upsert({ where: { id }, update: {}, create: { id, authorId: userId, postType: 'achievement', status: 'draft', visibility: 'public', title, body: text, plainText: text, contentBlocks: [{ type: 'paragraph', text }], contentHash: createHash('sha256').update(id).digest('hex'), bindings: { create: { targetType: type, targetId, titleSnapshot: title, sortOrder: 0 } } } })
  }
  /** 按创建时间增量消费；90 天窗口过期、历史补录或版本变化时重建。事件始终为事实来源。 */
  async snapshot(userId: string, force = false) {
    return this.prisma.$transaction(async (tx) => {
      const previous = await tx.userFeedSignalSnapshot.findUnique({ where: { userId } })
      const now = new Date(), since = new Date(now.getTime() - 90 * 86400000)
      const window = { userId, occurredAt: { gte: since }, createdAt: { lte: now } }
      const eventCount = await tx.activityEvent.count({ where: window })
      const prefixCount = previous && !force && previous.version === 2 ? await tx.activityEvent.count({ where: { ...window, createdAt: { lte: previous.updatedAt } } }) : -1
      const incremental = !!previous && prefixCount === previous.eventCount
      if (incremental && eventCount === previous.eventCount) return previous
      const topics: Affinity = incremental ? { ...previous.topicAffinity as Affinity } : {}
      const authors: Affinity = incremental ? { ...previous.authorAffinity as Affinity } : {}
      const postTypes: Affinity = incremental ? { ...previous.postTypeAffinity as Affinity } : {}
      const contents: Affinity = incremental ? { ...previous.learningContentAffinity as Affinity } : {}
      const negative: Affinity = incremental ? { ...previous.negativeFeedback as Affinity } : {}
      let cursor: string | undefined
      for (;;) {
        const events = await tx.activityEvent.findMany({ where: { ...window, ...(incremental ? { createdAt: { gt: previous.updatedAt, lte: now } } : {}) }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 500, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) })
        for (const event of events) {
          const data = event.payload as Record<string, unknown>
          const weight = signalWeights[event.eventType] || (['lesson_complete', 'lab_start', 'lab_complete', 'assessment_submit'].includes(event.eventType) ? 5 : 0)
          const add = (map: Affinity, key: unknown) => { if (typeof key === 'string') map[key] = Math.max(-20, Math.min(100, (map[key] || 0) + weight)) }
          add(authors, data.authorId)
          add(postTypes, data.postType)
          for (const id of Array.isArray(data.topicIds) ? data.topicIds : []) add(topics, id)
          for (const id of Array.isArray(data.bindingKeys) ? data.bindingKeys : []) add(contents, id)
          if (['course', 'lab', 'lesson', 'challenge', 'resource', 'article'].includes(event.targetType || '')) add(contents, `${event.targetType}:${event.targetId}`)
          if (weight < 0) add(negative, event.targetId)
        }
        if (events.length < 500) break
        cursor = events.at(-1)!.id
      }
      const data = { topicAffinity: topics, authorAffinity: authors, postTypeAffinity: postTypes, learningContentAffinity: contents, negativeFeedback: negative, eventCount, version: 2, updatedAt: now }
      return tx.userFeedSignalSnapshot.upsert({ where: { userId }, create: { userId, ...data }, update: data })
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
  }
}
