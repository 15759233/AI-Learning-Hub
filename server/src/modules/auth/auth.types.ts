import type { Request } from 'express'

export interface AuthUser {
  id: string
  email: string
  displayName: string
  roles: string[]
  permissions: string[]
}

export interface AuthRequest extends Request {
  user: AuthUser
}
