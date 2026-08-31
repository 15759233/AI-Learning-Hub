import { BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post, Put, Query, Res, StreamableFile, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { FileInterceptor } from '@nestjs/platform-express'
import { createReadStream } from 'node:fs'
import { access } from 'node:fs/promises'
import path from 'node:path'
import type { Response } from 'express'
import type { MediaContentType } from '@ai-learning-hub/contracts'
import { RawResponse } from '../../common/raw-response.decorator'
import { AuthGuard } from '../auth/auth.guard'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Permissions } from '../auth/permissions.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { STORAGE_SERVICE, type StorageService } from '../storage/storage.types'
import { MediaService } from './media.service'
import { MediaResolverService } from './media-resolver.service'
import { MediaDefaultDto, MediaQueryDto, MediaResolveDto, MediaUpdateDto, MediaUploadDto, PageVisualsDto } from './media.dto'

@Controller()
export class MediaFileController {
  constructor(private readonly media: MediaService, private readonly config: ConfigService, @Inject(STORAGE_SERVICE) private readonly storage: StorageService) {}
  private async send(id: string, publicOnly: boolean, response: Response) {
    const asset = await this.media.record(id)
    if (publicOnly && (asset.status !== 'active' || asset.deletedAt || asset.file.visibility !== 'public')) throw new NotFoundException('素材不存在')
    const file = asset.file
    response.set({ 'Content-Type': file.mimeType, 'X-Content-Type-Options': 'nosniff', 'Cache-Control': publicOnly ? 'public, max-age=60, must-revalidate' : 'private, no-store', 'Content-Security-Policy': "default-src 'none'; sandbox", 'Cross-Origin-Resource-Policy': 'same-origin' })
    if (file.storageDriver !== 'local') { response.redirect(await this.storage.getSignedUrl(file.id)); return }
    const root = path.resolve(this.config.get('STORAGE_LOCAL_PATH') || './var/uploads'), target = path.resolve(root, file.objectKey)
    if (!target.startsWith(`${root}${path.sep}`)) throw new NotFoundException('素材不存在')
    try { await access(target) } catch { throw new NotFoundException('素材文件不可用') }
    response.set('Content-Length', String(file.size))
    return new StreamableFile(createReadStream(target))
  }
  @Get('public/media/:id') @RawResponse()
  publicFile(@Param('id') id: string, @Res({ passthrough: true }) response: Response) { return this.send(id, true, response) }
  @Get('admin/media-assets/:id/preview') @UseGuards(AuthGuard, PermissionsGuard) @Permissions('media.read') @RawResponse()
  preview(@Param('id') id: string, @Res({ passthrough: true }) response: Response) { return this.send(id, false, response) }
}

@Controller('admin')
@UseGuards(AuthGuard, PermissionsGuard)
export class AdminMediaController {
  constructor(private readonly media: MediaService, private readonly resolver: MediaResolverService) {}
  @Get('media-assets') @Permissions('media.read') list(@Query() query: MediaQueryDto) { return this.media.list(query) }
  @Get('media-assets/resolve') @Permissions('media.read')
  resolve(@Query() query: MediaResolveDto) { return this.resolver.resolve({ ...query, contentType: query.contentType as MediaContentType }) }
  @Post('media-assets/upload') @Permissions('media.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 5 } }))
  upload(@UploadedFile() file: Express.Multer.File, @Body() input: MediaUploadDto, @CurrentUser() user: AuthUser) {
    if (!file) throw new BadRequestException('请选择图片')
    return this.media.upload(file, input, user)
  }
  @Get('media-assets/:id') @Permissions('media.read') detail(@Param('id') id: string) { return this.media.detail(id) }
  @Get('media-assets/:id/url') @Permissions('media.read')
  async url(@Param('id') id: string) { const asset = await this.media.detail(id); return { url: asset.url, expiresIn: 0 } }
  @Get('media-assets/:id/usage') @Permissions('media.read') usage(@Param('id') id: string) { return this.media.usage(id) }
  @Patch('media-assets/:id') @Permissions('media.write')
  update(@Param('id') id: string, @Body() input: MediaUpdateDto, @CurrentUser() user: AuthUser) { return this.media.update(id, input, user.id) }
  @Delete('media-assets/:id') @Permissions('media.delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) { return this.media.remove(id, user.id) }
  @Get('media-defaults') @Permissions('media.read') defaults() { return this.media.defaults() }
  @Put('media-defaults/:contentType/:categoryKey') @Permissions('media.default.manage')
  setDefault(@Param('contentType') type: string, @Param('categoryKey') category: string, @Body() input: MediaDefaultDto, @CurrentUser() user: AuthUser) { return this.media.setDefault(type, category, input, user.id) }
  @Get('page-visuals') @Permissions('media.read') visuals() { return this.media.pageVisualConfig() }
  @Put('page-visuals') @Permissions('media.default.manage')
  saveVisuals(@Body() input: PageVisualsDto, @CurrentUser() user: AuthUser) { return this.media.setPageVisuals(input.value, input.expectedRevision, user.id) }
}

@Controller('public')
export class PublicMediaController {
  constructor(private readonly media: MediaService) {}
  @Get('page-visuals') visuals() { return this.media.pageVisuals() }
}
