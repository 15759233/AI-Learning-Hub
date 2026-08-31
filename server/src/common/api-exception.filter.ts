import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'
import { Prisma } from '@prisma/client'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const status = error instanceof HttpException ? error.getStatus() : error instanceof Prisma.PrismaClientKnownRequestError && ['P2002', 'P2025', 'P2034'].includes(error.code) ? HttpStatus.CONFLICT : error instanceof Prisma.PrismaClientInitializationError ? HttpStatus.SERVICE_UNAVAILABLE : HttpStatus.INTERNAL_SERVER_ERROR
    const raw = error instanceof HttpException ? error.getResponse() : null
    const message = typeof raw === 'string'
      ? raw
      : raw && typeof raw === 'object' && 'message' in raw
        ? Array.isArray(raw.message) ? raw.message.join('；') : String(raw.message)
        : '服务暂时不可用'
    response.status(status).json({
      code: status * 100 + 1,
      message,
      details: {},
      data: null,
      requestId: response.locals.requestId,
    })
  }
}
