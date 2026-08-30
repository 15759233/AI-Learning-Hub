import { Body, Controller, Delete, Get, Param, Patch, Post, Put, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { Permissions } from '../auth/permissions.decorator'
import { PermissionsGuard } from '../auth/permissions.guard'
import { CreateHomepageItemDto, CreateHomepageModuleDto, ReorderDto, UpdateHomepageModuleDto } from './homepage.dto'
import { HomepageService } from './homepage.service'
import { HomepageConfigGuard } from './homepage-config.guard'

@Controller('admin/homepage')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminHomepageController {
  constructor(private readonly homepage: HomepageService) {}
  @Get('modules') @Permissions('homepage.read') modules() { return this.homepage.adminModules() }
  @Get('preview') @Permissions('homepage.read') preview() { return this.homepage.preview() }
  @Get('content-options') @Permissions('homepage.read') options(@Query('type') type: string) { return this.homepage.contentOptions(type) }
  @Post('modules') @Permissions('homepage.write') @UseGuards(HomepageConfigGuard) create(@Body() input: CreateHomepageModuleDto) { return this.homepage.createModule(input) }
  @Patch('modules/:id') @Permissions('homepage.write') @UseGuards(HomepageConfigGuard) update(@Param('id') id: string, @Body() input: UpdateHomepageModuleDto) { return this.homepage.updateModule(id, input) }
  @Put('modules/reorder') @Permissions('homepage.write') reorder(@Body() input: ReorderDto) { return this.homepage.reorder(input) }
  @Post('modules/:id/items') @Permissions('homepage.write') item(@Param('id') id: string, @Body() input: CreateHomepageItemDto) { return this.homepage.addItem(id, input) }
  @Patch('modules/:id/items/:itemId') @Permissions('homepage.write') updateItem(@Param('id') id: string, @Param('itemId') itemId: string, @Body() input: CreateHomepageItemDto) { return this.homepage.updateItem(id, itemId, input) }
  @Put('modules/:id/items/reorder') @Permissions('homepage.write') reorderItems(@Param('id') id: string, @Body() input: ReorderDto) { return this.homepage.reorderItems(id, input) }
  @Delete('modules/:id/items/:itemId') @Permissions('homepage.write') deleteItem(@Param('id') id: string, @Param('itemId') itemId: string) { return this.homepage.deleteItem(id, itemId) }
  @Post('publish') @Permissions('homepage.publish') publish() { return this.homepage.publish() }
}

@Controller('public/homepage')
export class PublicHomepageController {
  constructor(private readonly homepage: HomepageService) {}
  @Get() get() { return this.homepage.published() }
}
