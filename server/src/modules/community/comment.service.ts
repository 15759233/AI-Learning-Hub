import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import type { CommunityCommentDto, CommunityContentBlock } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'
import { CommunityPostService } from './post.service'
import { CommunityVisibilityPolicyService } from './visibility.service'
import { CommunityNotificationService } from './notification.service'
import { SignalsService } from '../signals/signals.service'
import { authorDto, authorInclude, json } from './community.mapper'
import type { CommentDto } from './community.dto'
import { actionEvent, idempotency, lockFileReferences, rateLimit } from '../../common/persistence'

@Injectable()
export class CommunityCommentService {
  constructor(private readonly prisma: PrismaService, private readonly posts: CommunityPostService, private readonly visibility: CommunityVisibilityPolicyService, private readonly notifications: CommunityNotificationService, private readonly signals: SignalsService) {}
  async list(userId: string, postId: string, admin = false): Promise<CommunityCommentDto[]> {
    if (!admin) await this.visibility.assertPost(userId, postId)
    const [rows, question, feedback] = await Promise.all([
      this.prisma.communityComment.findMany({ where: { postId }, include: { author: { include: authorInclude }, reactions: { where: { userId } } }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 500 }),
      this.prisma.communityQuestionState.findUnique({ where: { postId } }),
      this.visibility.authorExclusions(userId),
    ])
    const order = new Map(rows.map((row, index) => [row.id, index]))
    rows.sort((a, b) => (order.get(a.parentId || a.id) ?? rows.length) - (order.get(b.parentId || b.id) ?? rows.length) || Number(!!a.parentId) - Number(!!b.parentId))
    return rows.map((row) => {
      const deleted = !!row.deletedAt || row.status !== 'published' || row.author.status !== 'active' || (!admin && feedback.authors.includes(row.authorId))
      return { id: row.id, revision: row.revision, postId, author: deleted ? { id: '', username: '', displayName: '不可见用户', avatar: null, school: null, major: null, verifiedType: 'none' } : authorDto(row.author), parentId: row.parentId, rootId: row.rootId, body: deleted ? '该评论已删除或不可见' : row.body, contentBlocks: deleted ? [] : row.contentBlocks as CommunityContentBlock[], deleted, likes: deleted ? 0 : row.likeCount, liked: row.reactions.length > 0, accepted: !deleted && question?.acceptedCommentId === row.id, createdAt: row.createdAt.toISOString() }
    })
  }
  async save(userId: string, postId: string, input: CommentDto, id?: string, key?: string) {
    const post = await this.visibility.assertPost(userId, postId)
    if (post.status !== 'published') throw new BadRequestException('复核中的内容暂不可评论')
    const current = id ? await this.prisma.communityComment.findUnique({ where: { id } }) : null
    if (id && (!current || current.authorId !== userId || current.deletedAt || current.status !== 'published' || current.postId !== postId)) throw new ForbiddenException('只能编辑自己的可见评论')
    if (current && input.expectedRevision === undefined) throw new BadRequestException('编辑评论必须提供 expectedRevision')
    const parent = input.parentId ? await this.prisma.communityComment.findUnique({ where: { id: input.parentId } }) : null
    if (input.parentId && (!parent || parent.postId !== postId || parent.parentId || parent.deletedAt || parent.status !== 'published')) throw new BadRequestException('仅允许回复同一动态下的一级评论')
    if (parent && (await this.visibility.authorExclusions(userId)).authors.includes(parent.authorId)) throw new NotFoundException('评论不可见')
    const { clean, plainText } = await this.posts.blocks(userId, input.contentBlocks)
    if (plainText.length > 6000) throw new BadRequestException('评论最多 6000 字')
    const row = await this.prisma.$transaction(async (tx) => {
      await lockFileReferences(tx)
      const request = await idempotency(tx, userId, `comment:${postId}:${id || 'new'}`, key, input)
      if (request.resourceId) return tx.communityComment.findUniqueOrThrow({ where: { id: request.resourceId } })
      const fileIds = clean.flatMap((block) => block.type === 'image' ? [block.fileId] : [])
      if (fileIds.length && await tx.fileRecord.count({ where: { id: { in: fileIds }, uploadedBy: userId } }) !== new Set(fileIds).size) throw new BadRequestException('图片已失效，请重新上传')
      await rateLimit(tx, userId, 'comment', 30)
      if (current && !(await tx.communityComment.updateMany({ where: { id, revision: input.expectedRevision, deletedAt: null, status: 'published' }, data: { revision: { increment: 1 } } })).count) throw new ConflictException('评论已更新，请重新读取')
      const saved = id ? await tx.communityComment.update({ where: { id }, data: { body: plainText, contentBlocks: json(clean) } })
        : await tx.communityComment.create({ data: { postId, authorId: userId, parentId: parent?.id, rootId: parent?.id, body: plainText, contentBlocks: json(clean) } })
      if (!id) {
        await tx.communityPost.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } })
        await this.signals.record(userId, parent ? 'community_reply_create' : 'community_comment_create', 'post', postId, { authorId: post.authorId, postType: post.postType, commentId: saved.id }, tx)
        await this.notifications.send(parent?.authorId || post.authorId, userId, parent ? 'reply' : 'comment', 'post', postId, tx)
      }
      if (id) await actionEvent(tx, userId, 'comment_edited', 'comment', saved.id)
      await request.complete(saved.id)
      return saved
    })
    return (await this.list(userId, postId)).find((comment) => comment.id === row.id)!
  }
  async remove(userId: string, id: string) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id } })
    if (!comment || comment.authorId !== userId) throw new ForbiddenException('只能删除自己的评论')
    await this.visibility.viewer(userId)
    await this.prisma.$transaction(async (tx) => {
      const changed = await tx.communityComment.updateMany({ where: { id, authorId: userId, deletedAt: null }, data: { deletedAt: new Date(), status: 'removed', revision: { increment: 1 } } })
      if (changed.count) await actionEvent(tx, userId, 'comment_deleted', 'comment', id)
      if (changed.count && comment.status === 'published') await tx.communityPost.update({ where: { id: comment.postId }, data: { commentCount: { decrement: 1 } } })
      await tx.communityQuestionState.updateMany({ where: { acceptedCommentId: id }, data: { acceptedCommentId: null, status: 'open', solvedAt: null } })
    })
    return { deleted: true }
  }
  async accept(userId: string, postId: string, commentId: string) {
    const post = await this.visibility.assertPost(userId, postId)
    if (post.authorId !== userId || post.postType !== 'question') throw new ForbiddenException('只有问题作者可以采纳回答')
    const comment = await this.prisma.communityComment.findFirst({ where: { id: commentId, postId, deletedAt: null, status: 'published', author: { status: 'active' } } })
    if (!comment || (await this.visibility.authorExclusions(userId)).authors.includes(comment.authorId)) throw new NotFoundException('回答不存在')
    await this.prisma.$transaction(async (tx) => {
      await tx.communityQuestionState.update({ where: { postId }, data: { status: 'solved', acceptedCommentId: commentId, solvedAt: new Date() } })
      await this.notifications.send(comment.authorId, userId, 'answer_accepted', 'post', postId, tx)
    })
    return this.posts.detail(userId, postId)
  }
}
