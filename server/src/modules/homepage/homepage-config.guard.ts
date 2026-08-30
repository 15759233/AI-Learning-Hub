import { BadRequestException, CanActivate, ExecutionContext, Injectable } from '@nestjs/common'

const hasReservedKey = (value: unknown): boolean => Boolean(value && typeof value === 'object'
  && Object.keys(value).some((key) => ['__proto__', 'prototype', 'constructor'].includes(key)
    || hasReservedKey((value as Record<string, unknown>)[key])))

@Injectable()
export class HomepageConfigGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const { body } = context.switchToHttp().getRequest<{ body?: { config?: unknown } }>()
    // ValidationPipe会原地移除保留键，必须在它运行前拒绝，不能靠Transform恢复。
    if (hasReservedKey(body?.config)) throw new BadRequestException('首页配置包含未支持字段')
    return true
  }
}
