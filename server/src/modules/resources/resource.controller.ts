import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import type { AuthUser } from '../auth/auth.types'
import { PageQueryDto } from '../../common/content/page-query.dto'
import { CreateResourceDto, UpdateResourceDto } from './resource.dto'
import { ResourceService } from './resource.service'

@Controller('admin/resources')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminResourceController {
  constructor(private readonly resources: ResourceService) {}
  @Get() @Permissions('resource.read') list(@Query() query: PageQueryDto) { return this.resources.list(query) }
  @Post() @Permissions('resource.write') create(@Body() input: CreateResourceDto, @CurrentUser() user: AuthUser) { return this.resources.create(input, user.id) }
  @Get(':id') @Permissions('resource.read') detail(@Param('id') id: string) { return this.resources.detail(id) }
  @Patch(':id') @Permissions('resource.write') update(@Param('id') id: string, @Body() input: UpdateResourceDto, @CurrentUser() user: AuthUser) { return this.resources.update(id, input, user.id) }
  @Post(':id/publish') @Permissions('resource.publish') publish(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.resources.setPublished(id, true, user.id) }
  @Post(':id/archive') @Permissions('resource.publish') archive(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.resources.setPublished(id, false, user.id) }
  @Post(':id/versions/:versionId/restore') @Permissions('resource.write')
  restore(@Param('id') id: string, @Param('versionId') versionId: string, @CurrentUser() user: AuthUser) {
    return this.resources.restoreVersion(id, versionId, user.id)
  }
}

@Controller('resources')
export class PublicResourceController {
  constructor(private readonly resources: ResourceService) {}
  @Get() list(@Query() query: PageQueryDto) { return this.resources.list(query, true) }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.resources.detail(slug, true) }
}
