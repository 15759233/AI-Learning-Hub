import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { Reflector } from '@nestjs/core'
import type { Response } from 'express'
import { map, type Observable } from 'rxjs'
import { RAW_RESPONSE_KEY } from './raw-response.decorator'

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<T> {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler<T>): Observable<unknown> {
    if (this.reflector.getAllAndOverride<boolean>(RAW_RESPONSE_KEY, [context.getHandler(), context.getClass()])) return next.handle()
    const response = context.switchToHttp().getResponse<Response>()
    return next.handle().pipe(map((data) => ({
      code: 0,
      message: 'success',
      data,
      requestId: response.locals.requestId,
    })))
  }
}
