import type { Request } from 'express'

import type { AuthUser } from '@ai-learning-hub/contracts'
export type { AuthUser } from '@ai-learning-hub/contracts'

export interface AuthRequest extends Request {
  user: AuthUser
}
