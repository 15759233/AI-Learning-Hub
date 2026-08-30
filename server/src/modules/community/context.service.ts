import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common'
import type { CommunityBindingInput, CommunityBindingContextDto, CommunityContextDto, CommunityProfileDto, CommunityTopicDto } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'
import { ContentReferenceService } from '../../common/content-reference/content-reference.service'
import { CommunityVisibilityPolicyService } from './visibility.service'
import { CommunityInteractionService } from './interaction.service'
import { authorDto, authorInclude } from './community.mapper'
import type { OnboardingDto, ProfileDto } from './community.dto'
import { RegistrationService } from '../auth/registration.service'
import { authUserDto, authUserInclude } from '../auth/auth.mapper'
import { Prisma } from '@prisma/client'

@Injectable()
export class CommunityContextService {
  constructor(private readonly prisma: PrismaService, private readonly visibility: CommunityVisibilityPolicyService, private readonly references: ContentReferenceService, private readonly interactions: CommunityInteractionService, private readonly registration: RegistrationService) {}
  async byUsername(userId: string, username: string) {
    const user = await this.prisma.user.findUnique({ where: { username }, select: { id: true } })
    if (!user) throw new NotFoundException('用户不存在')
    return this.profile(userId, user.id)
  }
  async changeUsername(userId: string, username: string) {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const changed = await tx.user.updateMany({ where: { id: userId, usernameChangedAt: null }, data: { username, usernameChangedAt: new Date() } })
        if (!changed.count) throw new BadRequestException('公开用户名只能修改一次')
        return authUserDto(await tx.user.findUniqueOrThrow({ where: { id: userId }, include: authUserInclude }))
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') throw new ConflictException('此用户名已被使用')
      throw error
    }
  }
  async onboarding(userId: string, input: OnboardingDto) {
    const user = await this.visibility.viewer(userId), settings = await this.registration.settings()
    if (!user.emailVerifiedAt && (user.profile as Record<string, unknown>).emailVerificationRequired) throw new BadRequestException('请先打开邮件完成邮箱验证')
    if (settings.schoolRequired && !input.schoolId) throw new BadRequestException('请选择学校')
    if (input.schoolId && !await this.prisma.school.count({ where: { id: input.schoolId, status: 'active' } })) throw new BadRequestException('学校不存在')
    await this.interests(userId, input.themeIds)
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: userId }, data: { schoolId: input.schoolId || null, major: input.major, grade: input.grade, onboardingCompletedAt: new Date() } }),
      this.prisma.communityProfile.upsert({ where: { userId }, create: { userId, headline: input.headline }, update: { headline: input.headline } }),
    ])
    return authUserDto(await this.prisma.user.findUniqueOrThrow({ where: { id: userId }, include: authUserInclude }))
  }
  async bindingContext(userId: string, input: CommunityBindingInput): Promise<CommunityBindingContextDto> {
    await this.visibility.viewer(userId)
    const binding = (await this.references.resolveMany([input], userId, true)).get(`${input.type}:${input.id}`)!
    const courses = await this.prisma.course.findMany({ where: { status: 'published', deletedAt: null, OR: [{ id: input.type === 'course' ? binding.id : '__none__' }, { labs: { some: { labId: input.type === 'lab' ? binding.id : '__none__' } } }] }, select: { themeId: true }, take: 10 })
    const themes = [...courses.flatMap((row) => row.themeId ? [row.themeId] : []), ...(input.type === 'theme' ? [binding.id] : [])]
    const topics = await this.prisma.communityTopic.findMany({ where: { status: 'active', OR: [{ themeId: { in: themes } }, { posts: { some: { post: { AND: [await this.visibility.where(userId), { bindings: { some: { targetType: input.type, targetId: binding.id } } }] } } } }] }, select: { id: true }, orderBy: { sortOrder: 'asc' }, take: 3 })
    return { binding, topicIds: topics.map((topic) => topic.id) }
  }
  async topics(userId: string): Promise<CommunityTopicDto[]> {
    await this.visibility.viewer(userId)
    const rows = await this.prisma.communityTopic.findMany({ where: { status: 'active' }, include: { follows: { where: { userId } } }, orderBy: [{ recommended: 'desc' }, { sortOrder: 'asc' }], take: 200 })
    return rows.map(({ follows, ...row }) => ({ ...row, following: follows.length > 0 }))
  }
  async profile(userId: string, username: string): Promise<CommunityProfileDto> {
    await this.visibility.viewer(userId)
    const user = await this.prisma.user.findFirst({ where: { id: username, status: 'active' }, include: authorInclude })
    if (!user || (await this.visibility.authorExclusions(userId)).authors.includes(user.id)) throw new NotFoundException('用户不存在')
    const [topics, following, postCount] = await Promise.all([
      this.topics(user.id),
      this.prisma.communityUserFollow.count({ where: { followerId: userId, followeeId: user.id } }),
      this.prisma.communityPost.count({ where: { AND: [await this.visibility.where(userId), { authorId: user.id }] } }),
    ])
    return { ...authorDto(user), bio: user.communityProfile?.bio || '', headline: user.communityProfile?.headline || '', expertiseTopics: user.communityProfile?.expertiseTopics || [], ...(user.id === userId ? { allowAchievementDrafts: user.communityProfile?.allowAchievementDrafts || false } : {}), postCount, followerCount: user.communityProfile?.followerCount || 0, followingCount: user.communityProfile?.followingCount || 0, following: !!following, topics: topics.filter((topic) => topic.following) }
  }
  async updateProfile(userId: string, input: ProfileDto) {
    await this.visibility.viewer(userId)
    await this.prisma.communityProfile.upsert({ where: { userId }, create: { userId, ...input }, update: input })
    return this.profile(userId, userId)
  }
  async following(userId: string, username: string) {
    const profile = await this.profile(userId, username)
    const excluded = await this.visibility.authorExclusions(userId)
    const follows = await this.prisma.communityUserFollow.findMany({ where: { followerId: profile.id }, take: 200 })
    return (await this.prisma.user.findMany({ where: { id: { in: follows.map((row) => row.followeeId), notIn: excluded.authors }, status: 'active' }, include: authorInclude })).map(authorDto)
  }
  async interests(userId: string, themeIds: string[]) {
    if (themeIds.length !== 3) throw new BadRequestException('请选择 3 个学习方向')
    const themes = await this.prisma.theme.findMany({ where: { OR: [{ id: { in: themeIds } }, { slug: { in: themeIds } }], status: 'published', deletedAt: null } })
    if (themes.length !== 3) throw new BadRequestException('学习方向不存在')
    const topics = await this.prisma.communityTopic.findMany({ where: { themeId: { in: themes.map((theme) => theme.id) }, status: 'active' }, orderBy: { sortOrder: 'asc' } })
    for (const theme of themes) {
      const topic = topics.find((topic) => topic.themeId === theme.id)
      if (topic) await this.interactions.follow(userId, topic.id, true, true)
    }
    return this.context(userId)
  }
  async context(userId: string): Promise<CommunityContextDto> {
    const viewer = await this.visibility.viewer(userId)
    const excluded = await this.visibility.authorExclusions(userId)
    const [plan, progress, run, challenge, topics, users, count, notice] = await Promise.all([
      this.prisma.learningPlan.findFirst({ where: { userId, status: 'active' }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.lessonProgress.findFirst({ where: { userId, progress: { lt: 100 }, course: { status: 'published', deletedAt: null } }, orderBy: { updatedAt: 'desc' } }),
      this.prisma.labRun.findFirst({ where: { userId, status: { in: ['ready', 'running', 'stopped'] }, lab: { status: 'published', deletedAt: null } }, orderBy: { startedAt: 'desc' } }),
      this.prisma.challenge.findFirst({ where: { status: 'published', deletedAt: null }, orderBy: { publishedAt: 'desc' } }),
      this.topics(userId),
      this.prisma.user.findMany({ where: { id: { not: userId, notIn: excluded.authors }, status: 'active', communityProfile: { verifiedType: { in: ['teacher', 'mentor', 'official'] } } }, include: authorInclude, take: 4 }),
      this.prisma.communityTopicFollow.count({ where: { userId } }),
      this.prisma.notification.findFirst({ where: { status: 'published', audience: { in: ['all', 'student'] } }, orderBy: { publishedAt: 'desc' } }),
    ])
    const refs = await this.references.resolveMany([...(progress ? [{ type: 'course' as const, id: progress.courseId }] : []), ...(run ? [{ type: 'lab' as const, id: run.labId }] : []), ...(challenge ? [{ type: 'challenge' as const, id: challenge.id }] : [])], userId)
    const courseRef = progress ? refs.get(`course:${progress.courseId}`) : null
    const labRef = run ? refs.get(`lab:${run.labId}`) : null
    const challengeRef = challenge ? refs.get(`challenge:${challenge.id}`) : null
    return { todayPlan: plan ? { id: plan.id, title: plan.title, route: '/profile', progress: plan.progress } : null, continueCourse: courseRef ? { ...courseRef, progress: progress!.progress } : null, continueLab: labRef ? { ...labRef, progress: run!.progress } : null, currentChallenge: challengeRef || null, trendingTopics: topics.slice(0, 6), suggestedUsers: users.map(authorDto), needsInterests: count < 3 && !viewer.communityProfile?.postCount, officialNotice: notice ? { id: notice.id, title: notice.title, summary: notice.content, route: '/notifications' } : null }
  }
}
