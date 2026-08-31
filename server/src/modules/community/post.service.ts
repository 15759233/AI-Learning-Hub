import { BadRequestException, ConflictException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common'
import { createHash } from 'node:crypto'
import { Prisma } from '@prisma/client'
import type { CommunityContentBlock, CommunityPostDetailDto, CommunityTopicDto, CommunityPostSummaryDto, CommunityBindingInput } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'
import { ContentReferenceService } from '../../common/content-reference/content-reference.service'
import { SignalsService } from '../signals/signals.service'
import { CommunityVisibilityPolicyService } from './visibility.service'
import { authorDto, authorInclude, json } from './community.mapper'
import type { CommunityQueryDto, PostDto } from './community.dto'
import { actionEvent, idempotency, lockFileReferences, postRevision } from '../../common/persistence'

export const postInclude = {
  author: { include: authorInclude }, bindings: { orderBy: { sortOrder: 'asc' as const } },
  topics: { include: { topic: true } }, question: true,
} satisfies Prisma.CommunityPostInclude
export type HydratedPost = Prisma.CommunityPostGetPayload<{ include: typeof postInclude }>

@Injectable()
export class CommunityPostService {
  constructor(private readonly prisma: PrismaService, private readonly refs: ContentReferenceService, private readonly visibility: CommunityVisibilityPolicyService, private readonly signals: SignalsService) {}

  async blocks(userId: string, blocks: CommunityContentBlock[], draft = false) {
    if (!blocks.length && !draft) throw new BadRequestException('请填写正文')
    let imageCount = 0
    const files: string[] = []
    const clean = blocks.map((block): CommunityContentBlock => {
      const keys = Object.keys(block).filter((key) => (block as unknown as Record<string, unknown>)[key] !== undefined)
      const allowed = block.type === 'image' ? ['type', 'fileId', 'alt'] : block.type === 'code' ? ['type', 'code', 'language'] : ['type', 'text']
      if (keys.some((key) => !allowed.includes(key))) throw new BadRequestException('内容块字段与类型不匹配')
      if (block.type === 'image') {
        if (!block.fileId || ++imageCount > 4) throw new BadRequestException('最多上传 4 张图片')
        files.push(block.fileId)
        return { type: 'image', fileId: block.fileId, alt: block.alt || '' }
      }
      if (block.type === 'code') {
        if (typeof block.code !== 'string' || !block.code.trim()) throw new BadRequestException('代码块不能为空')
        return { type: 'code', language: block.language || 'text', code: block.code }
      }
      if (typeof block.text !== 'string' || !block.text.trim()) throw new BadRequestException('正文块不能为空')
      return { type: block.type, text: block.text.trim() }
    })
    if (files.length) {
      const count = await this.prisma.fileRecord.count({ where: { id: { in: [...new Set(files)] }, uploadedBy: userId, mimeType: { in: ['image/png', 'image/jpeg', 'image/webp'] }, size: { lte: 5 * 1024 * 1024 }, extension: { in: ['.png', '.jpg', '.jpeg', '.webp'] } } })
      if (count !== new Set(files).size) throw new BadRequestException('图片必须由本人上传且为不超过 5MB 的 PNG、JPEG 或 WebP')
    }
    const plainText = clean.map((block) => block.type === 'code' ? block.code : block.type === 'image' ? block.alt || '' : block.text).join('\n')
    if ((!draft && plainText.length < 1) || plainText.length > 20000) throw new BadRequestException('正文需要 1～20000 字')
    return { clean, plainText }
  }
  async save(userId: string, input: PostDto, id?: string, audit?: { actorId: string; action: string; reason: string }, key?: string) {
    const viewer = await this.visibility.viewer(userId)
    const current = id ? await this.prisma.communityPost.findUnique({ where: { id } }) : null
    if (id && (!current || current.authorId !== userId || current.deletedAt)) throw new ForbiddenException('只有作者可以编辑自己的内容')
    if (current && input.expectedRevision === undefined) throw new BadRequestException('编辑动态必须提供 expectedRevision')
    if (current && !['draft', 'published'].includes(current.status)) throw new ForbiddenException('审核中的内容暂不可编辑')
    if (input.visibility === 'school' && !viewer.schoolId) throw new BadRequestException('未认证学校，不能发布同校内容')
    if (input.status === 'published' && ['question', 'project'].includes(input.type) && !input.title?.trim()) throw new BadRequestException('问答和项目需要标题')
    const { clean, plainText } = await this.blocks(userId, input.contentBlocks, input.status === 'draft')
    const references = await this.refs.resolveMany(input.bindings, userId, true)
    if (input.status === 'published' && input.type === 'lab_result' && !input.bindings.some((ref) => ref.type === 'lab_run')) throw new BadRequestException('实训成果需要关联本人已提交的实训记录')
    if (input.status === 'published' && input.type === 'project') {
      const labIds = input.bindings.filter((ref) => ref.type === 'lab').map((ref) => references.get(`lab:${ref.id}`)!.id)
      if (!await this.prisma.lab.count({ where: { id: { in: labIds }, labType: 'project' } })) throw new BadRequestException('创客项目需要关联现有综合项目实训')
    }
    if (input.status === 'published' && input.type === 'frontier_discussion' && !input.bindings.some((ref) => ref.type === 'article')) throw new BadRequestException('前沿讨论需要关联文章')
    if (!!input.sourceType !== !!input.sourceId) throw new BadRequestException('分享来源类型与标识必须同时提供')
    if (input.sourceType === 'note' && !await this.prisma.learningNote.findFirst({ where: { id: input.sourceId, userId } })) throw new ForbiddenException('笔记只能由本人主动分享')
    if (input.sourceType === 'lab_run' && !input.bindings.some((ref) => ref.type === 'lab_run' && ref.id === input.sourceId)) throw new BadRequestException('实训来源与关联记录不一致')
    if (['challenge', 'article'].includes(input.sourceType || '') && !input.bindings.some((ref) => ref.type === input.sourceType && ref.id === input.sourceId)) throw new BadRequestException('分享来源与关联内容不一致')
    const topics = await this.prisma.communityTopic.findMany({ where: { id: { in: input.topicIds }, status: 'active' } })
    if (topics.length !== input.topicIds.length) throw new BadRequestException('话题已关闭或不存在')
    const contentHash = createHash('sha256').update(plainText.replace(/\s+/g, '').toLowerCase()).digest('hex')
    const post = await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      const request = await idempotency(tx, audit?.actorId || userId, `post:${id || 'new'}`, key, input)
      if (request.resourceId) return tx.communityPost.findUniqueOrThrow({ where: { id: request.resourceId } })
      const fileIds = clean.flatMap((block) => block.type === 'image' ? [block.fileId] : [])
      if (fileIds.length && await tx.fileRecord.count({ where: { id: { in: fileIds }, uploadedBy: userId } }) !== new Set(fileIds).size) throw new BadRequestException('图片已失效，请重新上传')
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`community-write:${userId}`},0))`
      const latest = id ? await tx.communityPost.findUnique({ where: { id } }) : null
      if (id && (!latest || latest.deletedAt || latest.authorId !== userId || !['draft', 'published'].includes(latest.status))) throw new ConflictException('动态状态已变化，请重新读取')
      if (latest && latest.revision !== input.expectedRevision) throw new ConflictException('已有较新的服务端版本，请保留当前输入并重新读取')
      if (input.status === 'published' && await tx.communityPost.count({ where: { authorId: userId, contentHash, id: { not: id }, status: { in: ['published', 'limited'] } } })) throw new ConflictException('相同内容已发布，请编辑原动态')
      const publishing = input.status === 'published' && latest?.status !== 'published'
      if (publishing && await tx.activityEvent.count({ where: { userId, eventType: 'community_post_publish', createdAt: { gt: new Date(Date.now() - 60000) } } }) >= 5) throw new HttpException('发布过于频繁，请稍后再试', 429)
      const oldTopicIds = current ? (await tx.communityPostTopic.findMany({ where: { postId: current.id } })).map((row) => row.topicId) : []
      const data = { authorId: userId, postType: input.type, status: input.status, visibility: input.visibility, schoolId: viewer.schoolId, title: input.title?.trim() || null, body: plainText, plainText, contentBlocks: json(clean), contentHash, sourceType: input.sourceType || null, sourceId: input.sourceId || null, publishedAt: input.status === 'published' ? current?.publishedAt || new Date() : null, ...(id ? { editedAt: new Date() } : {}) }
      if (latest) await postRevision(tx, latest.id, userId, 'user', '编辑前版本')
      const saved = id ? await tx.communityPost.update({ where: { id, revision: latest!.revision }, data: { ...data, revision: { increment: 1 } } }) : await tx.communityPost.create({ data })
      await tx.communityPostBinding.deleteMany({ where: { postId: saved.id } })
      await tx.communityPostTopic.deleteMany({ where: { postId: saved.id } })
      await tx.communityPostBinding.createMany({ data: input.bindings.map((ref, sortOrder) => ({ postId: saved.id, targetType: ref.type, targetId: references.get(`${ref.type}:${ref.id}`)!.id, titleSnapshot: references.get(`${ref.type}:${ref.id}`)!.title, sortOrder })), skipDuplicates: true })
      await tx.communityPostTopic.createMany({ data: topics.map((topic) => ({ postId: saved.id, topicId: topic.id })), skipDuplicates: true })
      if (input.type === 'question') await tx.communityQuestionState.upsert({ where: { postId: saved.id }, create: { postId: saved.id }, update: {} })
      else await tx.communityQuestionState.deleteMany({ where: { postId: saved.id } })
      await tx.communityProfile.upsert({ where: { userId }, create: { userId }, update: {} })
      await tx.communityProfile.update({ where: { userId }, data: { postCount: await tx.communityPost.count({ where: { authorId: userId, status: 'published', deletedAt: null } }) } })
      const topicIds = [...new Set([...topics.map((row) => row.id), ...oldTopicIds])]
      for (const topicId of topicIds) await tx.communityTopic.update({ where: { id: topicId }, data: { postCount: await tx.communityPostTopic.count({ where: { topicId, post: { status: 'published', deletedAt: null } } }) } })
      if (publishing) await this.signals.record(userId, 'community_post_publish', 'post', saved.id, { postType: input.type, topicIds: input.topicIds, bindingKeys: input.bindings.map((ref) => `${ref.type}:${references.get(`${ref.type}:${ref.id}`)!.id}`) }, tx)
      else await actionEvent(tx, audit?.actorId || userId, input.status === 'draft' ? 'post_draft_saved' : 'post_edited', 'post', saved.id, {}, audit ? 'admin-web' : 'student-web')
      await postRevision(tx, saved.id, audit?.actorId || userId, audit ? 'admin' : 'user', audit?.reason || '')
      if (audit) await tx.communityModerationAction.create({ data: { ...audit, targetType: 'post', targetId: saved.id } })
      await request.complete(saved.id)
      return saved
    })
    return this.detail(userId, post.id)
  }
  async remove(userId: string, id: string) {
    await this.visibility.viewer(userId)
    const post = await this.prisma.communityPost.findUnique({ where: { id } })
    if (!post || post.authorId !== userId) throw new ForbiddenException('只有作者可以删除自己的动态')
    await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      await tx.$queryRaw`SELECT id FROM community_posts WHERE id = ${id} FOR UPDATE`
      await postRevision(tx, id, userId)
      const changed = await tx.communityPost.updateMany({ where: { id, authorId: userId, deletedAt: null }, data: { deletedAt: new Date(), status: 'removed', revision: { increment: 1 } } })
      if (changed.count) { await postRevision(tx, id, userId); await actionEvent(tx, userId, 'post_deleted', 'post', id) }
      await tx.communityProfile.updateMany({ where: { userId }, data: { postCount: await tx.communityPost.count({ where: { authorId: userId, status: 'published', deletedAt: null } }) } })
      for (const { topicId } of await tx.communityPostTopic.findMany({ where: { postId: id } })) await tx.communityTopic.update({ where: { id: topicId }, data: { postCount: await tx.communityPostTopic.count({ where: { topicId, post: { status: 'published', deletedAt: null } } }) } })
    })
    return { deleted: true }
  }
  async mapMany(userId: string, rows: HydratedPost[]): Promise<CommunityPostDetailDto[]> {
    const ids = rows.map((row) => row.id)
    const [reactions, bookmarks, follows, topicFollows, teachers] = await Promise.all([
      this.prisma.communityPostReaction.findMany({ where: { userId, postId: { in: ids } } }),
      this.prisma.communityBookmark.findMany({ where: { userId, postId: { in: ids } } }),
      this.prisma.communityUserFollow.findMany({ where: { followerId: userId, followeeId: { in: rows.map((row) => row.authorId) } } }),
      this.prisma.communityTopicFollow.findMany({ where: { userId } }),
      this.prisma.communityComment.findMany({ where: { postId: { in: ids }, deletedAt: null, status: 'published', author: { status: 'active', communityProfile: { verifiedType: { in: ['teacher', 'mentor'] } }, userRoles: { some: { role: { code: { in: ['teacher', 'mentor'] } } } } } }, select: { postId: true } }),
    ])
    const references = await this.refs.resolveMany(rows.flatMap((row) => row.bindings.map((ref) => ({ type: ref.targetType as CommunityBindingInput['type'], id: ref.targetId }))), userId)
    // 他人的 LabRun 永远不进入普通 DTO，最多展示它关联的公开实训。
    const privateRuns = rows.filter((row) => row.authorId !== userId).flatMap((row) => row.bindings.filter((ref) => ref.targetType === 'lab_run').map((ref) => ref.targetId))
    const runs = privateRuns.length ? await this.prisma.labRun.findMany({ where: { id: { in: privateRuns }, status: 'submitted' }, select: { id: true, labId: true } }) : []
    const publicLabs = await this.refs.resolveMany(runs.map((run) => ({ type: 'lab', id: run.labId })), userId)
    const runRefs = new Map(runs.map((run) => [run.id, publicLabs.get(`lab:${run.labId}`)]))
    return rows.map((row) => ({
      id: row.id, revision: row.revision, type: row.postType, status: row.status, visibility: row.visibility, title: row.title,
      mediaCount: (row.contentBlocks as CommunityContentBlock[]).filter((block) => block.type === 'image').length,
      body: row.body, bodyPreview: row.plainText.slice(0, 320), contentBlocks: row.contentBlocks as CommunityContentBlock[],
      author: authorDto(row.author),
      bindings: [...new Map(row.bindings.map((ref) => {
        if (ref.targetType === 'lab_run' && row.authorId !== userId) return runRefs.get(ref.targetId)
        return references.get(`${ref.targetType}:${ref.targetId}`) || { type: ref.targetType as CommunityBindingInput['type'], id: ref.targetId, title: '关联内容已下架', route: '', status: 'unavailable' }
      }).filter((ref): ref is NonNullable<typeof ref> => !!ref).map((ref) => [`${ref.type}:${ref.id}`, ref])).values()],
      topics: row.topics.filter((ref) => ref.topic.status === 'active').map(({ topic }): CommunityTopicDto => ({ ...topic, following: topicFollows.some((follow) => follow.topicId === topic.id) })),
      stats: { likes: row.likeCount, useful: row.usefulCount, comments: row.commentCount, bookmarks: row.bookmarkCount },
      viewerState: { liked: reactions.some((r) => r.postId === row.id && r.reactionType === 'like'), markedUseful: reactions.some((r) => r.postId === row.id && r.reactionType === 'useful'), bookmarked: bookmarks.some((b) => b.postId === row.id), followingAuthor: follows.some((f) => f.followeeId === row.authorId) },
      recommendationReasons: [], labels: row.status === 'limited' ? [...row.labels, '内容正在人工复核'] : row.labels,
      question: row.question ? { status: row.question.status as 'open' | 'solved' | 'closed', acceptedCommentId: row.question.acceptedCommentId, teacherAnswered: teachers.some((c) => c.postId === row.id) } : null,
      publishedAt: (row.publishedAt || row.createdAt).toISOString(), editedAt: row.editedAt?.toISOString() || null,
    }))
  }
  async detail(userId: string, id: string, ownDrafts = true) {
    const row = await this.prisma.communityPost.findFirst({ where: { AND: [await this.visibility.where(userId, ownDrafts), { id }] }, include: postInclude })
    if (!row) throw new NotFoundException('内容不存在')
    return (await this.mapMany(userId, [row]))[0]
  }
  async list(userId: string, query: CommunityQueryDto, extra: Prisma.CommunityPostWhereInput = {}, ownDrafts = false): Promise<CommunityPostSummaryDto[]> {
    const bindings = query.bindingId ? await this.refs.resolveMany(['theme', 'course', 'lesson', 'lab', 'resource', 'article', 'challenge'].map((type) => ({ type: type as CommunityBindingInput['type'], id: query.bindingId! })), userId) : new Map()
    const bindingIds = query.bindingId ? [...new Set([query.bindingId, ...[...bindings.values()].map((ref) => ref.id)])] : []
    const rows = await this.prisma.communityPost.findMany({
      where: { AND: [await this.visibility.where(userId, ownDrafts), extra, {
        ...(query.keyword ? { OR: [{ title: { contains: query.keyword, mode: 'insensitive' } }, { plainText: { contains: query.keyword, mode: 'insensitive' } }] } : {}),
        ...(query.bindingId ? { bindings: { some: { targetId: { in: bindingIds } } } } : {}),
      }] },
      include: postInclude, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], take: 100,
    })
    return this.mapMany(userId, rows)
  }
}
