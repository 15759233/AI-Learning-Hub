import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import type { AdminUserSummaryDto, AdminUserDetailDto, AuthUser, PageResult } from '@ai-learning-hub/contracts'
import { PrismaService } from '../../prisma/prisma.service'
import { actionEvent, lockUser } from '../../common/persistence'
import { UserQuery, UserStatusUpdateDto, UserUpdateDto } from './users.dto'
import { RegistrationService } from '../auth/registration.service'

const userSelect = {
  id: true, username: true, displayName: true, email: true, status: true, userType: true, profile: true,
  registrationSource: true, major: true, grade: true, schoolId: true, departmentId: true,
  school: { select: { id: true, name: true } }, department: { select: { id: true, name: true } },
  lastLoginAt: true, createdAt: true, updatedAt: true, onboardingCompletedAt: true, emailVerifiedAt: true,
  revision: true, userRoles: { select: { role: { select: { code: true } } } },
  _count: { select: { communityPosts: { where: { status: 'published' as const, deletedAt: null } } } },
} satisfies Prisma.UserSelect
type UserRow = Prisma.UserGetPayload<{ select: typeof userSelect }>
const avatar = (profile: Prisma.JsonValue) => {
  const url = profile && typeof profile === 'object' && !Array.isArray(profile) ? profile.avatarUrl : null
  return typeof url === 'string' && /^\/(?:uploads|api\/v1\/files)\/[a-zA-Z0-9/_?.=&%-]+$/.test(url) ? url : null
}
const summary = (row: UserRow): AdminUserSummaryDto => ({
  id: row.id, username: row.username, displayName: row.displayName, email: row.email,
  status: row.status, userType: row.userType, registrationSource: row.registrationSource,
  major: row.major, grade: row.grade, school: row.school, department: row.department,
  lastLoginAt: row.lastLoginAt?.toISOString() || null, createdAt: row.createdAt.toISOString(),
  onboardingCompleted: !!row.onboardingCompletedAt, emailVerified: !!row.emailVerifiedAt,
  roles: row.userRoles.map((grant) => grant.role.code), communityPostCount: row._count.communityPosts,
  avatar: avatar(row.profile), revision: row.revision,
})
export const dateRange = (from?: string, to?: string) => ({ ...(from ? { gte: new Date(from) } : {}), ...(to ? { lte: new Date(to.length === 10 ? `${to}T23:59:59.999Z` : to) } : {}) })
@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService, private readonly registration: RegistrationService) {}
  where(q: UserQuery): Prisma.UserWhereInput {
    return {
      ...(q.keyword ? { OR: ['username', 'displayName', 'email', 'studentNo', 'teacherNo'].map((field) => ({ [field]: { contains: q.keyword, mode: 'insensitive' } })) } : {}),
      ...(q.status ? { status: q.status } : {}), ...(q.userType ? { userType: q.userType } : {}),
      ...(q.role ? { userRoles: { some: { role: { code: q.role } } } } : {}),
      ...(q.registrationSource ? { registrationSource: q.registrationSource } : {}),
      ...(q.schoolId ? { schoolId: q.schoolId } : {}),
      ...(q.onboardingCompleted === undefined ? {} : { onboardingCompletedAt: q.onboardingCompleted ? { not: null } : null }),
      ...(q.emailVerified === undefined ? {} : { emailVerifiedAt: q.emailVerified ? { not: null } : null }),
      createdAt: dateRange(q.createdFrom, q.createdTo), lastLoginAt: dateRange(q.lastLoginFrom, q.lastLoginTo),
    }
  }
  async list(query: UserQuery): Promise<PageResult<AdminUserSummaryDto>> {
    const where = this.where(query)
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: userSelect, orderBy: [{ [query.sortBy]: query.sortOrder }, { id: query.sortOrder }], skip: (query.page - 1) * query.pageSize, take: query.pageSize }),
      this.prisma.user.count({ where }),
    ], { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    return { items: rows.map(summary), total, page: query.page, pageSize: query.pageSize }
  }
  async detail(id: string): Promise<AdminUserDetailDto> {
    const row = await this.prisma.user.findUnique({ where: { id }, select: {
      ...userSelect, studentNo: true, teacherNo: true, agreementVersion: true, agreementAcceptedAt: true,
      passwordHash: true, communityProfile: true, identities: { select: { provider: true, createdAt: true } },
      loginLogs: { orderBy: { createdAt: 'desc' }, take: 1, select: { result: true } },
    } })
    if (!row) throw new NotFoundException('用户不存在')
    const [activeSessions, commentCount, reportCount, activities, audits] = await this.prisma.$transaction([
      this.prisma.refreshToken.count({ where: { userId: id, revokedAt: null, expiresAt: { gt: new Date() } } }),
      this.prisma.communityComment.count({ where: { authorId: id, status: 'published', deletedAt: null } }),
      this.prisma.communityReport.count({ where: { reporterId: id } }),
      this.prisma.activityEvent.findMany({ where: { userId: id, NOT: { eventType: 'post_draft_saved' }, OR: [{ targetType: { not: 'post' } }, { targetId: { in: (await this.prisma.communityPost.findMany({ where: { authorId: id, status: { not: 'draft' }, publishedAt: { not: null } }, select: { id: true } })).map((p) => p.id) } }, { targetType: null }] }, orderBy: { occurredAt: 'desc' }, take: 100, select: { id: true, userId: true, actionType: true, eventType: true, entityType: true, entityId: true, targetType: true, targetId: true, source: true, occurredAt: true } }),
      this.prisma.auditLog.findMany({ where: { targetType: 'user', targetId: id }, orderBy: { createdAt: 'desc' }, take: 100 }),
    ])
    return {
      user: { ...summary(row), studentNo: row.studentNo, teacherNo: row.teacherNo, updatedAt: row.updatedAt.toISOString() },
      security: { agreementVersion: row.agreementVersion, agreementAcceptedAt: row.agreementAcceptedAt?.toISOString() || null,
        emailVerifiedAt: row.emailVerifiedAt?.toISOString() || null, passwordSet: !!row.passwordHash, activeSessions,
        lastLoginResult: row.loginLogs[0]?.result || null, identities: row.identities.map((r) => ({ provider: r.provider, createdAt: r.createdAt.toISOString() })) },
      community: { revision: row.communityProfile?.revision || 1, headline: row.communityProfile?.headline || '', bio: row.communityProfile?.bio || '', verifiedType: row.communityProfile?.verifiedType || 'none', expertiseTopics: row.communityProfile?.expertiseTopics || [], postCount: row._count.communityPosts, commentCount, reportCount, followerCount: row.communityProfile?.followerCount || 0, followingCount: row.communityProfile?.followingCount || 0 },
      activities: activities.map((r) => ({ id: r.id, actorId: r.userId, eventType: r.actionType || r.eventType, entityType: r.entityType || r.targetType, entityId: r.entityId || r.targetId, source: r.source, occurredAt: r.occurredAt.toISOString() })),
      audits: audits.map((r) => ({ id: r.id, action: r.action, reason: typeof (r.details as Prisma.JsonObject).reason === 'string' ? String((r.details as Prisma.JsonObject).reason) : '', createdAt: r.createdAt.toISOString() })),
    }
  }
  private async assertTarget(actor: AuthUser, id: string, tx: Prisma.TransactionClient) {
    if (actor.id === id) throw new BadRequestException('不能对当前管理员执行此账号操作')
    await lockUser(tx, id)
    const target = await tx.user.findUnique({ where: { id }, select: { userRoles: { select: { role: { select: { code: true } } } } } })
    if (!target) throw new NotFoundException('用户不存在')
    if (target.userRoles.some((r) => ['admin', 'super_admin'].includes(r.role.code)) && !actor.roles.includes('super_admin')) throw new ForbiddenException('管理管理员账号需要超级管理员权限')
  }
  private async audit(tx: Prisma.TransactionClient, actorId: string, id: string, action: string, reason: string) {
    await tx.auditLog.create({ data: { actorId, action, targetType: 'user', targetId: id, details: { reason } } })
    await actionEvent(tx, actorId, action, 'user', id, { reason }, 'admin-web')
  }
  async status(actor: AuthUser, id: string, input: UserStatusUpdateDto) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTarget(actor, id, tx)
      if (!input.expectedRevision) throw new BadRequestException('请携带账号版本')
      if (!(await tx.user.updateMany({ where: { id, revision: input.expectedRevision }, data: { status: input.status, revision: { increment: 1 }, ...(input.status !== 'active' ? { sessionVersion: { increment: 1 } } : {}) } })).count) throw new ConflictException('账号资料已变化，请刷新')
      if (input.status !== 'active') await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
      await this.audit(tx, actor.id, id, `user_${input.status}`, input.reason)
      return { updated: true }
    })
  }
  async action(actor: AuthUser, id: string, action: 'revoke_sessions' | 'reset_onboarding', reason: string) {
    return this.prisma.$transaction(async (tx) => {
      await this.assertTarget(actor, id, tx)
      await tx.user.update({ where: { id }, data: { revision: { increment: 1 }, ...(action === 'revoke_sessions' ? { sessionVersion: { increment: 1 } } : { onboardingCompletedAt: null }) } })
      if (action === 'revoke_sessions') await tx.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } })
      await this.audit(tx, actor.id, id, action, reason)
      return { updated: true }
    })
  }
  async resetPassword(actor: AuthUser, id: string, reason: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.assertTarget(actor, id, tx)
      await this.audit(tx, actor.id, id, 'password_reset_requested', reason)
    })
    const target = await this.prisma.user.findUniqueOrThrow({ where: { id }, select: { email: true } })
    return this.registration.forgot(target.email, `admin:${actor.id}`)
  }
  async update(actor: AuthUser, id: string, input: UserUpdateDto) {
    const { expectedRevision, reason, ...data } = input
    if (data.schoolId && !await this.prisma.school.count({ where: { id: data.schoolId, status: 'active' } })) throw new BadRequestException('学校不存在')
    if (data.departmentId && !await this.prisma.department.count({ where: { id: data.departmentId, schoolId: data.schoolId } })) throw new BadRequestException('院系与学校不匹配')
    await this.prisma.$transaction(async (tx) => {
      await this.assertTarget(actor, id, tx)
      if (!(await tx.user.updateMany({ where: { id, revision: expectedRevision }, data: { ...data, schoolId: data.schoolId || null, departmentId: data.departmentId || null, revision: { increment: 1 } } })).count) throw new ConflictException('资料已变化，请刷新')
      await this.audit(tx, actor.id, id, 'profile_updated', reason)
    })
    return this.detail(id)
  }
}
