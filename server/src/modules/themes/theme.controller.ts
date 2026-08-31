import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import type { AuthUser } from '../auth/auth.types'
import { PageQueryDto } from '../../common/content/page-query.dto'
import { CreateThemeDto, UpdateThemeDto, UpsertPathDto } from './theme.dto'
import { ThemeService } from './theme.service'

@Controller('admin/themes')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminThemeController {
  constructor(private readonly themes: ThemeService) {}
  @Delete(':id') @Permissions('theme.write') remove(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.themes.remove(id, user.id) }
  @Get() @Permissions('theme.read') list(@Query() query: PageQueryDto) { return this.themes.list(query) }
  @Post() @Permissions('theme.write') create(@Body() input: CreateThemeDto, @CurrentUser() user: AuthUser) { return this.themes.create(input, user.id) }
  @Get(':id') @Permissions('theme.read') detail(@Param('id') id: string) { return this.themes.detail(id) }
  @Patch(':id') @Permissions('theme.write') update(@Param('id') id: string, @Body() input: UpdateThemeDto, @CurrentUser() user: AuthUser) { return this.themes.update(id, input, user.id) }
  @Post(':id/publish') @Permissions('theme.publish') publish(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.themes.setPublished(id, true, user.id) }
  @Post(':id/archive') @Permissions('theme.publish') archive(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.themes.setPublished(id, false, user.id) }

  @Put(':id/path') @Permissions('theme.write')
  path(@Param('id') themeId: string, @Body() input: UpsertPathDto) { return this.themes.upsertPath(themeId, input) }
}

@Controller('themes')
export class PublicThemeController {
  constructor(private readonly themes: ThemeService) {}
  @Get() list(@Query() query: PageQueryDto) { return this.themes.list(query, true) }
  @Get(':slug') detail(@Param('slug') slug: string) { return this.themes.detail(slug, true) }
}
