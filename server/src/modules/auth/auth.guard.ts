import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import type { AuthRequest, AuthUser } from './auth.types'

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly config: ConfigService) {}

  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>()
    const token = request.headers.authorization?.match(/^Bearer (.+)$/)?.[1]
    if (!token) throw new UnauthorizedException('请先登录')
    try {
      request.user = await this.jwt.verifyAsync<AuthUser>(token, { secret: this.config.getOrThrow('JWT_SECRET') })
      return true
    } catch {
      throw new UnauthorizedException('登录状态已失效')
    }
  }
}
