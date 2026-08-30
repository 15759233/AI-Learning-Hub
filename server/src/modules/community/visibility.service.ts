import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class CommunityVisibilityPolicyService {
  constructor(private readonly prisma: PrismaService) {}
  async viewer(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, include: { communityProfile: true, school: true, userRoles: { include: { role: true } } } })
    if (!user || user.status !== 'active') throw new ForbiddenException('账号当前不可使用社区')
    return user
  }
  async authorExclusions(userId: string) {
    const feedback = await this.prisma.communityFeedback.findMany({ where: { OR: [{ userId }, { targetId: userId, feedbackType: 'block' }] } })
    return {
      authors: feedback.filter((row) => ['block', 'mute_author'].includes(row.feedbackType)).map((row) => row.userId === userId ? row.targetId : row.userId),
      posts: feedback.filter((row) => ['hide', 'not_interested'].includes(row.feedbackType)).map((row) => row.targetId),
      types: feedback.filter((row) => row.feedbackType === 'not_interested' && row.postType).map((row) => row.postType!),
    }
  }
  async where(userId: string, ownDrafts = false): Promise<Prisma.CommunityPostWhereInput> {
    const [viewer, feedback] = await Promise.all([this.viewer(userId), this.authorExclusions(userId)])
    return {
      deletedAt: null, author: { status: 'active' },
      authorId: { notIn: feedback.authors }, id: { notIn: feedback.posts }, postType: { notIn: feedback.types },
      AND: [
        { OR: [{ status: { in: ['published', 'limited'] } }, ...(ownDrafts ? [{ authorId: userId, status: 'draft' as const }] : [])] },
        { OR: [{ visibility: 'public' }, ...(viewer.schoolId ? [{ visibility: 'school' as const, schoolId: viewer.schoolId }] : [])] },
      ],
    }
  }
  async assertPost(userId: string, id: string, ownDrafts = false) {
    const post = await this.prisma.communityPost.findFirst({ where: { AND: [await this.where(userId, ownDrafts), { id }] } })
    if (!post) throw new NotFoundException('内容不存在或当前不可见')
    return post
  }
}
