import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { AuthRequest } from './auth.types'
import { PERMISSIONS_KEY } from './permissions.decorator'

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext) {
    const required = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) || []
    if (!required.length) return true
    const permissions = context.switchToHttp().getRequest<AuthRequest>().user.permissions || []
    if (!required.every((permission) => permissions.includes(permission))) throw new ForbiddenException('缺少所需权限')
    return true
  }
}
