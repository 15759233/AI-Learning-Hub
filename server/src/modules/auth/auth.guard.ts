import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { AuthRequest, AuthUser } from './auth.types'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService, private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>()
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!token) throw new UnauthorizedException('请先登录')
    try {
      const payload = await this.jwt.verifyAsync<AuthUser>(token, { secret: this.config.getOrThrow('JWT_SECRET') })
      if (!payload.id) throw new UnauthorizedException()
      const user = await this.prisma.user.findUnique({ where: { id: payload.id }, include: { userRoles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } })
      if (!user || user.status !== 'active') throw new UnauthorizedException()
      request.user = { id: user.id, email: user.email, displayName: user.displayName, roles: user.userRoles.map((row) => row.role.code), permissions: [...new Set(user.userRoles.flatMap((row) => row.role.permissions.map((grant) => grant.permission.code)))] }
      return true
    } catch {
      throw new UnauthorizedException('登录状态已失效')
    }
  }
}
