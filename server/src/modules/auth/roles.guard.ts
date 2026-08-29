import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AuthRequest } from './auth.types'
import { ROLES_KEY } from './roles.decorator'

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]) || []
    if (!required.length) return true
    const user = context.switchToHttp().getRequest<AuthRequest>().user
    if (!required.some((role) => user.roles.includes(role))) throw new ForbiddenException('无权执行该操作')
    return true
  }
}
