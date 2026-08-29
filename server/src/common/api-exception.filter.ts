import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common'
import type { Response } from 'express'

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>()
    const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR
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
      requestId: response.locals.requestId,
    })
  }
}
