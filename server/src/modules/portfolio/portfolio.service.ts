import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { CommunityPostService } from '../community/post.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { UpdatePortfolioDto } from './portfolio.dto'

@Injectable()
export class PortfolioService {
  constructor(private readonly prisma: PrismaService, private readonly posts: CommunityPostService) {}

  async convertPost(userId: string, postId: string) {
    const post = await this.posts.detail(userId, postId)
    if (post.author.id !== userId) throw new ForbiddenException('只能将本人发布的动态加入作品集')
    const existing = await this.prisma.portfolio.findFirst({ where: { userId, sourcePostId: post.id } })
    if (existing) return existing
    return this.prisma.portfolio.create({
      data: {
        userId,
        title: post.title || '未命名作品',
        summary: post.bodyPreview || '',
        body: post.body,
        contentBlocks: post.contentBlocks as object,
        sourcePostId: post.id,
        sourcePostType: post.type,
        visibility: 'public',
      },
    })
  }

  async list(userId: string) {
    return this.prisma.portfolio.findMany({ where: { userId }, orderBy: [{ createdAt: 'desc' }], take: 200 })
  }

  async detail(userId: string, id: string) {
    const item = await this.prisma.portfolio.findUnique({ where: { id } })
    if (!item) throw new NotFoundException('作品不存在')
    if (item.userId !== userId && item.visibility !== 'public') throw new NotFoundException('作品不存在')
    return item
  }

  async update(userId: string, id: string, input: UpdatePortfolioDto) {
    const item = await this.prisma.portfolio.findUnique({ where: { id } })
    if (!item || item.userId !== userId) throw new NotFoundException('作品不存在')
    return this.prisma.portfolio.update({ where: { id }, data: input })
  }

  async remove(userId: string, id: string) {
    const item = await this.prisma.portfolio.findUnique({ where: { id } })
    if (!item || item.userId !== userId) throw new NotFoundException('作品不存在')
    await this.prisma.portfolio.delete({ where: { id } })
    return { deleted: true }
  }
}