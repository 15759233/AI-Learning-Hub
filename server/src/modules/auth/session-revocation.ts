import { UnauthorizedException } from '@nestjs/common'
import { SESSION_REPLACED, SESSION_REPLACED_MESSAGE } from '@ai-learning-hub/contracts'

export function assertNotReplaced(session: { revokedAt: Date | null; revocationReason: string | null } | null) {
  if (session?.revokedAt && session.revocationReason === 'replaced_by_login') {
    throw new UnauthorizedException({ errorCode: SESSION_REPLACED, message: SESSION_REPLACED_MESSAGE })
  }
}
