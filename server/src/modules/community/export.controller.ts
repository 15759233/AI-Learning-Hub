import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common'
import { CommunityExportService } from './export.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import type { CommunityExportFormat } from '@ai-learning-hub/contracts'

@Controller('community/export')
@UseGuards(AuthGuard)
export class CommunityExportController {
  constructor(private readonly exporter: CommunityExportService) {}

  @Get('posts/:id')
  exportPost(@CurrentUser() user: AuthUser, @Param('id') id: string, @Query('format') format?: string, @Query('includeComments') includeComments?: string) {
    const safeFormat = format === 'markdown' || format === 'csv' ? format : 'json'
    return this.exporter.exportPost(user.id, id, safeFormat as CommunityExportFormat, includeComments !== 'false')
  }
}