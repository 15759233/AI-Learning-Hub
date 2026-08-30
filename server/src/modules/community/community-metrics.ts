import type { PrismaService } from '../../prisma/prisma.service'

/** 社区运营页和平台看板使用同一统计口径（UTC自然日）。 */
export async function communityMetrics(prisma: PrismaService) {
  const day = new Date(); day.setUTCHours(0, 0, 0, 0)
  const [todayPosts, unanswered, pendingReports, active] = await Promise.all([
    prisma.communityPost.count({ where: { publishedAt: { gte: day }, deletedAt: null } }),
    prisma.communityQuestionState.count({ where: { status: 'open', post: { status: { in: ['published', 'limited'] }, deletedAt: null } } }),
    prisma.communityReport.count({ where: { status: { in: ['pending', 'reviewing'] } } }),
    prisma.activityEvent.groupBy({ by: ['userId'], where: { surface: 'community', occurredAt: { gte: day }, userId: { not: null } } }),
  ])
  return { todayPosts, unanswered, pendingReports, activeUsers: active.length }
}
