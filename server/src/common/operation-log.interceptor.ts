import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common'
import { catchError, from, mergeMap, throwError } from 'rxjs'
import { PrismaService } from '../prisma/prisma.service'
import type { AuthRequest } from '../modules/auth/auth.types'

@Injectable()
export class OperationLogInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler) {
    const request = context.switchToHttp().getRequest<AuthRequest & { id?: string }>()
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method)) return next.handle()
    const write = (result: string) => this.prisma.operationLog.create({
      data: {
        actorId: request.user?.id,
        method: request.method,
        path: request.path,
        result,
        requestId: request.id,
      },
    })
    return next.handle().pipe(
      mergeMap((value) => from(write('success')).pipe(mergeMap(() => [value]))),
      catchError((error: unknown) => from(write('failed')).pipe(mergeMap(() => throwError(() => error)))),
    )
  }
}
