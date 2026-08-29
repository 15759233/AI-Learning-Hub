import { Controller, Get } from '@nestjs/common'
import { PrismaService } from './prisma/prisma.service'

@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  async health() {
    await this.prisma.$queryRaw`SELECT 1`
    return { status: 'ok', database: 'connected', timestamp: new Date().toISOString() }
  }

  @Get('version')
  version() {
    return { commit: process.env.APP_COMMIT_SHA || 'development', environment: process.env.NODE_ENV || 'development' }
  }
}
