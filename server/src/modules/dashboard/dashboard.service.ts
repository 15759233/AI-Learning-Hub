import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { communityMetrics } from '../community/community-metrics'
import { readChallengeSnapshot } from '../challenges/challenge-version'

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async get() {
    const [community, publishedCourses, publishedLabs, publishedResources, challenges, limitedPosts] = await Promise.all([
      communityMetrics(this.prisma),
      this.prisma.course.count({ where: { status: 'published', deletedAt: null } }),
      this.prisma.lab.count({ where: { status: 'published', deletedAt: null } }),
      this.prisma.resource.count({ where: { status: 'published', deletedAt: null } }),
      this.prisma.challenge.findMany({ where: { status: 'published', deletedAt: null }, include: { publishedVersion: true } }),
      this.prisma.communityPost.count({ where: { status: 'limited', deletedAt: null } }),
    ])
    const activeChallenges = challenges.filter((item) => {
      const data = readChallengeSnapshot(item.publishedVersion?.snapshot)?.data
      return data && (!data.startAt || Date.parse(String(data.startAt)) <= Date.now()) && (!data.endAt || Date.parse(String(data.endAt)) >= Date.now())
    }).length
    const end = new Date()
    const start = new Date(end.getTime() - 7 * 86_400_000)
    const previousStart = new Date(start.getTime() - 7 * 86_400_000)
    const [
      users,
      previousUsers,
      activeRows,
      previousActiveRows,
      courses,
      previousCourses,
      labRows,
      previousLabRows,
      events,
      daily,
      counts,
      drafts,
      scheduled,
      operations,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { createdAt: { lt: start } } }),
      this.prisma.activityEvent.findMany({ where: { createdAt: { gte: start }, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.activityEvent.findMany({ where: { createdAt: { gte: previousStart, lt: start }, userId: { not: null } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.course.count({ where: { publishedAt: { gte: start } } }),
      this.prisma.course.count({ where: { publishedAt: { gte: previousStart, lt: start } } }),
      this.prisma.labRun.findMany({ where: { startedAt: { gte: start } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.labRun.findMany({ where: { startedAt: { gte: previousStart, lt: start } }, distinct: ['userId'], select: { userId: true } }),
      this.prisma.activityEvent.findMany({ where: { createdAt: { gte: start }, userId: { not: null } }, select: { userId: true, createdAt: true } }),
      this.prisma.dailyUserStatistic.findMany({ where: { date: { gte: start } }, orderBy: { date: 'asc' } }),
      Promise.all([
        this.prisma.homepageModule.count(),
        this.prisma.theme.count({ where: { deletedAt: null } }),
        this.prisma.course.count({ where: { deletedAt: null } }),
        this.prisma.lab.count({ where: { deletedAt: null } }),
        this.prisma.resource.count({ where: { deletedAt: null } }),
        this.prisma.article.count({ where: { deletedAt: null } }),
        this.prisma.challenge.count({ where: { deletedAt: null } }),
        this.prisma.growthModuleSetting.count(),
      ]),
      Promise.all([
        this.prisma.theme.count({ where: { status: { in: ['draft', 'reviewing'] }, deletedAt: null } }),
        this.prisma.course.count({ where: { status: { in: ['draft', 'reviewing'] }, deletedAt: null } }),
        this.prisma.lab.count({ where: { status: { in: ['draft', 'reviewing'] }, deletedAt: null } }),
        this.prisma.question.count({ where: { status: 'draft' } }),
      ]),
      this.prisma.article.findMany({ where: { scheduledAt: { gte: end }, status: 'reviewing' }, select: { id: true, title: true, scheduledAt: true }, take: 20 }),
      this.prisma.operationLog.findMany({ orderBy: { createdAt: 'desc' }, take: 12 }),
    ])
    const metric = (current: number, previous: number) => ({
      current,
      previous,
      changeRate: previous ? Number((((current - previous) / previous) * 100).toFixed(1)) : null,
      range: { start: start.toISOString(), end: end.toISOString() },
    })
    const dailyMap = new Map<string, Set<string>>()
    for (const event of events) {
      const date = event.createdAt.toISOString().slice(0, 10)
      if (!dailyMap.has(date)) dailyMap.set(date, new Set())
      if (event.userId) dailyMap.get(date)!.add(event.userId)
    }
    const statistics = new Map(daily.map((item) => [item.date.toISOString().slice(0, 10), item]))
    const trend = Array.from({ length: 7 }, (_, index) => {
      const date = new Date(start.getTime() + index * 86_400_000).toISOString().slice(0, 10)
      return {
        date,
        activeUsers: dailyMap.get(date)?.size || statistics.get(date)?.activeUsers || 0,
        learningMinutes: statistics.get(date)?.learningMinutes || 0,
      }
    })
    const moduleKeys = ['homepage', 'themes', 'courses', 'labs', 'resources', 'articles', 'challenges', 'growth']
    const todos = [
      ...[
        { id: 'community-reports', count: community.pendingReports, title: '条举报待处理' },
        { id: 'community-questions', count: community.unanswered, title: '个学习问题待回答' },
        { id: 'community-limited', count: limitedPosts, title: '条受限内容待复核' },
      ].filter((item) => item.count > 0).map((item) => ({ id: item.id, type: 'community', title: `${item.count} ${item.title}`, module: 'community', dueAt: null, route: '/community', priority: 'high' })),
      ...drafts.map((count, index) => count ? {
        id: `draft-${index}`,
        type: 'draft',
        title: `${count} 项内容等待审核或发布`,
        module: ['themes', 'courses', 'labs', 'questions'][index],
        dueAt: null,
        route: `/${['themes', 'courses', 'labs', 'challenges'][index]}`,
        priority: count > 10 ? 'high' : 'normal',
      } : null).filter(Boolean),
      ...scheduled.map((item) => ({
        id: item.id,
        type: 'scheduled',
        title: item.title,
        module: 'articles',
        dueAt: item.scheduledAt?.toISOString() || null,
        route: '/articles',
        priority: 'normal',
      })),
    ]
    return {
      community,
      learning: { publishedCourses, publishedLabs, publishedResources, activeChallenges },
      kpis: {
        users: metric(users, previousUsers),
        activeUsers: metric(activeRows.length, previousActiveRows.length),
        publishedCourses: metric(courses, previousCourses),
        labParticipants: metric(labRows.length, previousLabRows.length),
      },
      trend,
      moduleCounts: Object.fromEntries(moduleKeys.map((key, index) => [key, counts[index]])),
      todos,
      operations,
    }
  }
}
