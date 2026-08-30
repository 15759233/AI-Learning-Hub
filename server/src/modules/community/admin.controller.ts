import { BadRequestException, Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Permissions } from '../auth/permissions.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { CommunityPostService, postInclude } from './post.service'
import { CommunityCommentService } from './comment.service'
import { CommunityNotificationService } from './notification.service'
import { LearningFeedPipeline } from '../feed/feed.service'
import { authorDto, authorInclude, json } from './community.mapper'
import { AdminPostDto, CommunityQueryDto, ModerationDto, OfficialDto, PolicyDto, TopicDto } from './community.dto'
import { Inject } from '@nestjs/common'
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types'
import { communityMetrics } from './community-metrics'

@Controller('admin/community')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions('community.read')
export class CommunityAdminController {
  constructor(private readonly prisma: PrismaService, private readonly posts: CommunityPostService, private readonly comments: CommunityCommentService, private readonly notifications: CommunityNotificationService, private readonly feed: LearningFeedPipeline, @Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}
  @Patch('posts/:id') @Permissions('community.write')
  async editPost(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: AdminPostDto) {
    const row = await this.prisma.communityPost.findUnique({ where: { id }, include: { bindings: true } })
    if (!row || row.status === 'draft') throw new BadRequestException('动态不存在或为私人草稿')
    const result = await this.posts.save(row.authorId, { ...input, bindings: row.bindings.map((binding) => ({ type: binding.targetType as AdminPostDto['bindings'][number]['type'], id: binding.targetId })), sourceType: row.sourceType as AdminPostDto['sourceType'] || undefined, sourceId: row.sourceId || undefined }, id, { actorId: user.id, action: 'edit', reason: input.reason })
    return this.mappedForOperator(user.id, result.id)
  }
  @Post('official/:id/posts') @Permissions('community.official.publish')
  async officialPost(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: AdminPostDto) {
    const author = await this.prisma.user.findUnique({ where: { id }, include: authorInclude })
    if (!author || author.status !== 'active' || !['official', 'teacher', 'mentor'].includes(authorDto(author).verifiedType)) throw new BadRequestException('只能选择已认证的有效官方或指导账号')
    const result = await this.posts.save(id, input, undefined, { actorId: user.id, action: 'official_publish', reason: input.reason })
    return this.mappedForOperator(user.id, result.id)
  }
  private async mappedForOperator(userId: string, id: string) {
    const row = await this.prisma.communityPost.findUniqueOrThrow({ where: { id }, include: postInclude })
    return (await this.posts.mapMany(userId, [row]))[0]
  }
  @Get('media/:id')
  async media(@Param('id') id: string) {
    const attached = await this.prisma.communityPost.count({ where: { status: { not: 'draft' }, contentBlocks: { array_contains: [{ type: 'image', fileId: id }] } } }) || await this.prisma.communityComment.count({ where: { post: { status: { not: 'draft' } }, contentBlocks: { array_contains: [{ type: 'image', fileId: id }] } } })
    if (!attached) throw new BadRequestException('图片未关联社区内容')
    return { url: await this.storage.getSignedUrl(id) }
  }
  @Get('summary') async summary() {
    return communityMetrics(this.prisma)
  }
  @Get('posts') async list(@CurrentUser() user: AuthUser, @Query() query: CommunityQueryDto) {
    const rows = await this.prisma.communityPost.findMany({ where: { status: { not: 'draft' }, ...(query.type !== 'all' ? { postType: query.type } : {}), ...(query.keyword ? { OR: [{ title: { contains: query.keyword, mode: 'insensitive' } }, { plainText: { contains: query.keyword, mode: 'insensitive' } }] } : {}) }, include: postInclude, orderBy: { createdAt: 'desc' }, take: 200 })
    return this.posts.mapMany(user.id, rows)
  }
  @Get('posts/:id') async detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const row = await this.prisma.communityPost.findUnique({ where: { id }, include: postInclude })
    if (!row || row.status === 'draft') throw new BadRequestException('动态不存在或为私人草稿')
    const reports = user.permissions.includes('community.report.manage') ? await this.prisma.communityReport.findMany({ where: { OR: [{ postId: id }, { comment: { postId: id } }] }, select: { id: true, postId: true, commentId: true, reason: true, description: true, status: true, createdAt: true } }) : []
    let recommendation = null
    if (user.permissions.includes('community.feed.manage')) {
      const session = await this.prisma.communityFeedSession.findFirst({ where: { entries: { array_contains: [{ type: 'post', id }] } }, orderBy: { createdAt: 'desc' } })
      const entry = (session?.entries as unknown as Array<{ id: string; score?: { source: string; total: number; dimensions: Record<string, number>; reasonCodes: string[] } }> | undefined)?.find((item) => item.id === id)
      if (entry?.score) recommendation = { policyVersion: session!.policyVersion, candidateSources: [...new Set([entry.score.source, ...entry.score.reasonCodes])], total: entry.score.total, dimensions: entry.score.dimensions, filter: row.status === 'published' ? 'allow' : row.status === 'limited' ? 'downrank' : 'drop', reasons: entry.score.reasonCodes }
    }
    return { post: (await this.posts.mapMany(user.id, [row]))[0], comments: await this.comments.list(user.id, id, true), reports, recommendation }
  }
  @Get('comments') async commentList() { return this.prisma.communityComment.findMany({ where: { post: { status: { not: 'draft' } } }, include: { author: { select: { id: true, displayName: true } } }, orderBy: { createdAt: 'desc' }, take: 200 }) }
  @Get('topics') async topicList() { return (await this.prisma.communityTopic.findMany({ orderBy: { sortOrder: 'asc' } })).map((row) => ({ ...row, following: false })) }
  @Post('topics') @Permissions('community.topic.manage')
  async createTopic(@CurrentUser() user: AuthUser, @Body() input: TopicDto) { return this.saveTopic(user.id, input) }
  @Patch('topics/:id') @Permissions('community.topic.manage')
  async editTopic(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: TopicDto) { return this.saveTopic(user.id, input, id) }
  private async saveTopic(actorId: string, input: TopicDto, id?: string) {
    const { reason, ...fields } = input
    if (fields.themeId && !await this.prisma.theme.count({ where: { id: fields.themeId, status: 'published', deletedAt: null } })) throw new BadRequestException('关联学习主题不存在')
    return this.prisma.$transaction(async (tx) => {
      const data = { ...fields, themeId: fields.themeId || null }
      const row = id ? await tx.communityTopic.update({ where: { id }, data }) : await tx.communityTopic.create({ data })
      await tx.communityModerationAction.create({ data: { actorId, targetType: 'topic', targetId: row.id, action: id ? 'update' : 'create', reason } })
      return row
    })
  }
  @Get('reports') @Permissions('community.report.manage')
  reports() { return this.prisma.communityReport.findMany({ select: { id: true, postId: true, commentId: true, reason: true, description: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 200 }) }
  @Post('reports/:id/handle') @Permissions('community.report.manage', 'community.moderate')
  async handle(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: ModerationDto) {
    const report = await this.prisma.communityReport.findUnique({ where: { id } })
    if (!report) throw new BadRequestException('举报不存在')
    if (input.action !== 'reject') await this.moderate(user, report.commentId ? 'comment' : 'post', report.commentId || report.postId!, input)
    await this.prisma.$transaction([
      this.prisma.communityReport.update({ where: { id }, data: { status: input.action === 'reject' ? 'rejected' : 'resolved', handledBy: user.id, handledAt: new Date() } }),
      this.prisma.communityModerationAction.create({ data: { actorId: user.id, targetType: 'report', targetId: id, action: input.action, reason: input.reason } }),
    ])
    return { handled: true }
  }
  @Post(':target/:id/moderate') @Permissions('community.moderate')
  async moderate(@CurrentUser() user: AuthUser, @Param('target') target: string, @Param('id') id: string, @Body() input: ModerationDto) {
    if (!['post', 'comment'].includes(target) || input.action === 'reject') throw new BadRequestException('处理对象或操作不合法')
    if (input.action === 'disable_author' && !user.permissions.includes('platform.manage')) throw new BadRequestException('处理作者需要平台管理权限')
    return this.prisma.$transaction(async (tx) => {
      const row = target === 'post' ? await tx.communityPost.findUnique({ where: { id } }) : await tx.communityComment.findUnique({ where: { id } })
      if (!row) throw new BadRequestException('内容不存在')
      if (target === 'post' && row.status === 'draft') throw new BadRequestException('私人草稿不属于社区审核范围')
      if (target === 'comment' && await tx.communityPost.count({ where: { id: (row as { postId: string }).postId, status: 'draft' } })) throw new BadRequestException('私人草稿不属于社区审核范围')
      if (input.action === 'disable_author') await tx.user.update({ where: { id: row.authorId }, data: { status: 'disabled' } })
      else if (target === 'post') {
        const status = input.action === 'limit' ? 'limited' : input.action === 'hide' ? 'hidden' : input.action === 'remove' ? 'removed' : 'published'
        await tx.communityPost.update({ where: { id }, data: input.action === 'label' ? { labels: { push: input.label || input.reason } } : { status, deletedAt: input.action === 'remove' ? new Date() : null } })
        await tx.communityProfile.updateMany({ where: { userId: row.authorId }, data: { postCount: await tx.communityPost.count({ where: { authorId: row.authorId, status: 'published', deletedAt: null } }) } })
        for (const { topicId } of await tx.communityPostTopic.findMany({ where: { postId: id } })) await tx.communityTopic.update({ where: { id: topicId }, data: { postCount: await tx.communityPostTopic.count({ where: { topicId, post: { status: 'published', deletedAt: null } } }) } })
      } else {
        if (['limit', 'label'].includes(input.action)) throw new BadRequestException('评论只支持隐藏、删除或恢复')
        await tx.communityComment.update({ where: { id }, data: { status: input.action === 'restore' ? 'published' : input.action === 'hide' ? 'hidden' : 'removed', deletedAt: input.action === 'remove' ? new Date() : null } })
        const postId = (row as { postId: string }).postId
        await tx.communityPost.update({ where: { id: postId }, data: { commentCount: await tx.communityComment.count({ where: { postId, status: 'published', deletedAt: null } }) } })
        if (input.action !== 'restore') await tx.communityQuestionState.updateMany({ where: { acceptedCommentId: id }, data: { acceptedCommentId: null, solvedAt: null, status: 'open' } })
      }
      await tx.communityModerationAction.create({ data: { actorId: user.id, targetType: target, targetId: id, action: input.action, reason: input.reason } })
      await this.notifications.send(row.authorId, user.id, 'moderation', target, id, tx)
      return { handled: true }
    })
  }
  @Get('official') @Permissions('community.official.publish')
  async official() {
    const users = await this.prisma.user.findMany({ where: { status: 'active' }, include: authorInclude, take: 100 })
    return users.map((row) => ({ ...authorDto(row), expertiseTopics: row.communityProfile?.expertiseTopics || [] }))
  }
  @Patch('official/:id') @Permissions('community.official.publish')
  async verify(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: OfficialDto) {
    const roleCode = input.verifiedType === 'official' ? 'community_official' : input.verifiedType
    const role = input.verifiedType !== 'none' ? await this.prisma.role.findUnique({ where: { code: roleCode } }) : null
    if (input.verifiedType !== 'none' && !role) throw new BadRequestException('认证角色尚未配置')
    await this.prisma.$transaction(async (tx) => {
      await tx.communityProfile.upsert({ where: { userId: id }, create: { userId: id, verifiedType: input.verifiedType, expertiseTopics: input.expertiseTopics }, update: { verifiedType: input.verifiedType, expertiseTopics: input.expertiseTopics } })
      await tx.userRole.deleteMany({ where: { userId: id, role: { code: { in: ['community_official', 'teacher', 'mentor'] } } } })
      if (role) await tx.userRole.create({ data: { userId: id, roleId: role.id } })
      await tx.communityModerationAction.create({ data: { actorId: user.id, targetType: 'user', targetId: id, action: 'verify', reason: input.reason, metadata: { verifiedType: input.verifiedType } } })
    })
    return { updated: true }
  }
  @Get('policy') @Permissions('community.feed.manage')
  policy() { return this.feed.policy() }
  @Patch('policy') @Permissions('community.feed.manage')
  async updatePolicy(@CurrentUser() user: AuthUser, @Body() input: PolicyDto) {
    const policy = await this.feed.policy()
    if (input.parameter === 'limitedPenalty') policy.penalties.limited = input.value / 100
    else {
      const key = { qualityWeight: 'quality', learningWeight: 'learning', explorationWeight: 'exploration' }[input.parameter]
      if (!key) throw new BadRequestException('策略参数不合法')
      policy.weights[key] = input.value / 100
      const sum = Object.values(policy.weights).reduce((total, value) => total + value, 0)
      for (const key of Object.keys(policy.weights)) policy.weights[key] /= sum
    }
    policy.version = `learning-v1-${Date.now()}`
    await this.prisma.$transaction([
      this.prisma.systemSetting.upsert({ where: { key: 'community_feed_policy' }, create: { key: 'community_feed_policy', value: json(policy) }, update: { value: json(policy) } }),
      this.prisma.communityModerationAction.create({ data: { actorId: user.id, targetType: 'feed', targetId: policy.version, action: 'configure', reason: input.reason, metadata: { parameter: input.parameter, value: input.value } } }),
    ])
    return policy
  }
}
