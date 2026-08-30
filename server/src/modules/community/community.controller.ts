import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Put, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { FileInterceptor } from '@nestjs/platform-express'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import type { CommunityReactionType } from '@ai-learning-hub/contracts'
import { CommunityPostService } from './post.service'
import { CommunityCommentService } from './comment.service'
import { CommunityInteractionService } from './interaction.service'
import { CommunityNotificationService } from './notification.service'
import { CommunityContextService } from './context.service'
import { CommunityVisibilityPolicyService } from './visibility.service'
import { LearningFeedPipeline } from '../feed/feed.service'
import { SignalsService } from '../signals/signals.service'
import { STORAGE_SERVICE, StorageService } from '../storage/storage.types'
import { FileAccessService } from '../storage/file-access.service'
import { BindingDto, CommentDto, CommunityQueryDto, FeedbackDto, FeedUpdatesDto, ImpressionsDto, InterestsDto, PostDto, ProfileDto, ReportDto, SignalDto } from './community.dto'

@Controller('community')
@UseGuards(AuthGuard)
export class CommunityController {
  constructor(private readonly posts: CommunityPostService, private readonly comments: CommunityCommentService, private readonly interactions: CommunityInteractionService, private readonly notifications: CommunityNotificationService, private readonly context: CommunityContextService, private readonly feed: LearningFeedPipeline, private readonly visibility: CommunityVisibilityPolicyService, private readonly signals: SignalsService, private readonly prisma: PrismaService, @Inject(STORAGE_SERVICE) private readonly storage: StorageService, private readonly files: FileAccessService) {}
  @Get('feed') getFeed(@CurrentUser() user: AuthUser, @Query() query: CommunityQueryDto) { return this.feed.feed(user.id, query) }
  @Get('feed/updates') async updates(@CurrentUser() user: AuthUser, @Query() input: FeedUpdatesDto) {
    const following = input.mode === 'following' ? await this.prisma.communityUserFollow.findMany({ where: { followerId: user.id }, select: { followeeId: true } }) : []
    return { count: await this.prisma.communityPost.count({ where: { AND: [await this.visibility.where(user.id), { publishedAt: { gt: new Date(input.since) }, ...(input.type === 'all' ? {} : { postType: input.type }) }, ...(input.mode === 'following' ? [{ OR: [{ authorId: { in: following.map((row) => row.followeeId) } }, { topics: { some: { topic: { follows: { some: { userId: user.id } } } } } }] }] : [])] } }) }
  }
  @Get('context') getContext(@CurrentUser() user: AuthUser) { return this.context.context(user.id) }
  @Get('bindings/context') bindingContext(@CurrentUser() user: AuthUser, @Query() input: BindingDto) { return this.context.bindingContext(user.id, input) }
  @Post('feed/impressions') impressions(@CurrentUser() user: AuthUser, @Body() input: ImpressionsDto) { return this.feed.impressions(user.id, input) }
  @Post('feed/dwell') dwell(@CurrentUser() user: AuthUser, @Body() input: ImpressionsDto) { return this.feed.impressions(user.id, input, true) }
  @Post('feed/feedback') feedback(@CurrentUser() user: AuthUser, @Body() input: FeedbackDto) { return this.interactions.feedback(user.id, input.postId, input.type) }
  @Post('signals') async signal(@CurrentUser() user: AuthUser, @Body() input: SignalDto) {
    await this.visibility.viewer(user.id)
    let payload: Record<string, unknown> = {}
    if (input.targetType === 'post') {
      const post = await this.posts.detail(user.id, input.targetId, false)
      const bindings = post.bindings.filter((ref) => ref.status !== 'unavailable' && ref.route)
      if (input.binding && !bindings.some((ref) => ref.type === input.binding!.type && ref.id === input.binding!.id)) throw new BadRequestException('学习行动与动态关联不匹配')
      if (input.eventType.startsWith('community_to_') && !input.binding) throw new BadRequestException('学习行动需要关联内容')
      const bindingKeys = input.binding ? [`${input.binding.type}:${input.binding.id}`] : bindings.map((ref) => `${ref.type}:${ref.id}`)
      if (input.binding?.type === 'lesson') {
        const lesson = await this.prisma.courseLesson.findUnique({ where: { id: input.binding.id }, select: { chapter: { select: { version: { select: { courseId: true } } } } } })
        if (lesson) bindingKeys.push(`course:${lesson.chapter.version.courseId}`)
      }
      if (input.binding?.type === 'lab_run') {
        const run = await this.prisma.labRun.findFirst({ where: { id: input.binding.id, userId: user.id }, select: { labId: true } })
        if (run) bindingKeys.push(`lab:${run.labId}`)
      }
      payload = { authorId: post.author.id, postType: post.type, topicIds: post.topics.map((row) => row.id), bindingKeys }
    } else if (input.targetType === 'user') await this.context.profile(user.id, input.targetId)
    else if (!(await this.context.topics(user.id)).some((topic) => topic.id === input.targetId)) throw new BadRequestException('话题不存在')
    await this.signals.record(user.id, input.eventType, input.targetType, input.targetId, payload, this.prisma, { requestId: input.requestId, sessionId: input.sessionId, position: input.position })
    if (input.eventType === 'community_post_click' && input.requestId) await this.prisma.communityFeedImpression.updateMany({ where: { viewerId: user.id, requestId: input.requestId, postId: input.targetId }, data: { clickedAt: new Date() } })
    return { recorded: true }
  }
  @Get('posts') list(@CurrentUser() user: AuthUser, @Query() query: CommunityQueryDto) { return this.posts.list(user.id, query) }
  @Post('posts') create(@CurrentUser() user: AuthUser, @Body() input: PostDto) { return this.posts.save(user.id, input) }
  @Get('posts/:id') detail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.posts.detail(user.id, id) }
  @Patch('posts/:id') edit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: PostDto) { return this.posts.save(user.id, input, id) }
  @Delete('posts/:id') remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.posts.remove(user.id, id) }
  @Get('posts/:id/comments') commentList(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.comments.list(user.id, id) }
  @Post('posts/:id/comments') commentCreate(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: CommentDto) { return this.comments.save(user.id, id, input) }
  @Patch('comments/:id') async commentEdit(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: CommentDto) {
    const comment = await this.prisma.communityComment.findUnique({ where: { id } })
    if (!comment) throw new BadRequestException('评论不存在')
    return this.comments.save(user.id, comment.postId, input, id)
  }
  @Delete('comments/:id') commentRemove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.comments.remove(user.id, id) }
  @Post('questions/:postId/accept/:commentId') accept(@CurrentUser() user: AuthUser, @Param('postId') id: string, @Param('commentId') commentId: string) { return this.comments.accept(user.id, id, commentId) }
  @Put('posts/:id/reactions/:type') react(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('type') type: CommunityReactionType) { return this.interactions.react(user.id, id, type, true) }
  @Delete('posts/:id/reactions/:type') unreact(@CurrentUser() user: AuthUser, @Param('id') id: string, @Param('type') type: CommunityReactionType) { return this.interactions.react(user.id, id, type, false) }
  @Put('comments/:id/like') likeComment(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.commentLike(user.id, id, true) }
  @Delete('comments/:id/like') unlikeComment(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.commentLike(user.id, id, false) }
  @Put('posts/:id/bookmark') bookmark(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.react(user.id, id, 'bookmark', true) }
  @Delete('posts/:id/bookmark') unbookmark(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.react(user.id, id, 'bookmark', false) }
  @Get('bookmarks') bookmarks(@CurrentUser() user: AuthUser, @Query() query: CommunityQueryDto) { return this.posts.list(user.id, query, { bookmarks: { some: { userId: user.id } } }) }
  @Get('users/:id') profile(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.context.profile(user.id, id) }
  @Get('users/:id/following') following(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.context.following(user.id, id) }
  @Get('users/:id/posts') async userPosts(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: CommunityQueryDto) { const profile = await this.context.profile(user.id, id); return this.posts.list(user.id, query, { authorId: profile.id }, profile.id === user.id) }
  @Get('users/:id/answers') async answers(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query() query: CommunityQueryDto) { const profile = await this.context.profile(user.id, id); return this.posts.list(user.id, query, { comments: { some: { authorId: profile.id, deletedAt: null, status: 'published' } } }) }
  @Put('users/:id/follow') followUser(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.follow(user.id, id, false, true) }
  @Delete('users/:id/follow') unfollowUser(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.follow(user.id, id, false, false) }
  @Patch('profile') profileEdit(@CurrentUser() user: AuthUser, @Body() input: ProfileDto) { return this.context.updateProfile(user.id, input) }
  @Post('interests') interests(@CurrentUser() user: AuthUser, @Body() input: InterestsDto) { return this.context.interests(user.id, input.themeIds) }
  @Get('topics') topics(@CurrentUser() user: AuthUser) { return this.context.topics(user.id) }
  @Get('topics/:slug/posts') topicPosts(@CurrentUser() user: AuthUser, @Param('slug') slug: string, @Query() query: CommunityQueryDto) { return this.posts.list(user.id, query, { topics: { some: { topic: { slug, status: 'active' } } } }) }
  @Put('topics/:id/follow') followTopic(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.follow(user.id, id, true, true) }
  @Delete('topics/:id/follow') unfollowTopic(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.follow(user.id, id, true, false) }
  @Post('posts/:id/report') report(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: ReportDto) { return this.interactions.report(user.id, id, input) }
  @Post('comments/:id/report') reportComment(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: ReportDto) { return this.interactions.report(user.id, id, input, true) }
  @Post('posts/:id/hide') hide(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.feedback(user.id, id, 'hide') }
  @Post('posts/:id/not-interested') notInterested(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.feedback(user.id, id, 'not_interested') }
  @Post('users/:id/mute') mute(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.feedback(user.id, id, 'mute_author') }
  @Post('users/:id/block') block(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.interactions.feedback(user.id, id, 'block') }
  @Get('notifications') notificationList(@CurrentUser() user: AuthUser) { return this.notifications.list(user.id) }
  @Get('notifications/unread-count') async unread(@CurrentUser() user: AuthUser) { return { count: (await this.notifications.list(user.id)).filter((row) => !row.readAt).length } }
  @Post('notifications/read-all') readAll(@CurrentUser() user: AuthUser) { return this.notifications.read(user.id) }
  @Post('notifications/:id/read') read(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.notifications.read(user.id, id) }
  @Post('media')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1 } }))
  async upload(@CurrentUser() user: AuthUser, @UploadedFile() file: Express.Multer.File) {
    await this.visibility.viewer(user.id)
    if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.mimetype)) throw new BadRequestException('仅支持 PNG、JPEG、WebP 图片')
    const bytes = file.buffer
    const valid = file.mimetype === 'image/png' ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])) : file.mimetype === 'image/jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP'
    if (!valid) throw new BadRequestException('图片内容与 MIME 不匹配')
    return this.storage.upload(file, { uploadedBy: user.id, visibility: 'private' })
  }
  @Get('media/:id/url') async media(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    const file = await this.files.assert(user.id, id)
    if (!file.mimeType.startsWith('image/')) throw new BadRequestException('不是图片')
    return { url: file.storageDriver === 'local' ? `/api/v1/files/${id}/download` : await this.storage.getSignedUrl(id) }
  }
}
