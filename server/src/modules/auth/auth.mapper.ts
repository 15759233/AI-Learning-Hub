import { Prisma } from '@prisma/client'
import type { AuthUser } from '@ai-learning-hub/contracts'
export const authUserInclude = {
  school: true,
  userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } },
} satisfies Prisma.UserInclude
export function authUserDto(user: Prisma.UserGetPayload<{ include: typeof authUserInclude }>): AuthUser {
  return {
    id: user.id, email: user.email, username: user.username, displayName: user.displayName,
    avatarUrl: null, school: user.school?.name || null, major: user.major,
    onboardingCompleted: !!user.onboardingCompletedAt,
    emailVerificationRequired: !user.emailVerifiedAt && !!(user.profile as Record<string, unknown>)?.emailVerificationRequired,
    roles: user.userRoles.map((row) => row.role.code),
    permissions: [...new Set(user.userRoles.flatMap((row) => row.role.permissions.map((grant) => grant.permission.code)))],
  }
}
