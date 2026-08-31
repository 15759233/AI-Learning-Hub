import { Transform, Type } from 'class-transformer'
import { IsBoolean, IsEnum, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'
import { MediaAssetKind, MediaAssetSource, MediaAssetStatus } from '@prisma/client'
import type { PublicPageVisualSetting } from '@ai-learning-hub/contracts'

export const mediaTypes = ['theme', 'course', 'lab', 'resource', 'article', 'challenge', 'page_hero', 'global'] as const
export class MediaQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 24
  @IsOptional() @IsString() @Length(0, 120) keyword = ''
  @IsOptional() @IsEnum(MediaAssetKind) kind?: MediaAssetKind
  @IsOptional() @IsEnum(MediaAssetSource) source?: MediaAssetSource
  @IsOptional() @IsEnum(MediaAssetStatus) status?: MediaAssetStatus
  @IsOptional() @IsIn(mediaTypes) contentType?: string
  @IsOptional() @IsString() @Length(1, 80) categoryKey?: string
  @IsOptional() @Transform(({ value }) => value === 'true' ? true : value === 'false' ? false : value) @IsBoolean() onlyUnused = false
}
export class MediaUploadDto {
  @IsString() @Length(1, 120) name!: string
  @IsOptional() @IsEnum(MediaAssetKind) kind: MediaAssetKind = 'cover'
  @IsOptional() @IsIn(mediaTypes) contentType = 'global'
  @IsOptional() @IsString() @Matches(/^[a-z0-9-]{1,80}$/) categoryKey = 'generic'
  @IsOptional() @IsString() @Length(0, 240) altText = ''
}
export class MediaUpdateDto {
  @Type(() => Number) @IsInt() @Min(1) expectedRevision!: number
  @IsOptional() @IsString() @Length(1, 120) name?: string
  @IsOptional() @IsString() @Length(0, 240) altText?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) focalX?: number
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1) focalY?: number
  @IsOptional() @IsEnum(MediaAssetStatus) status?: MediaAssetStatus
}
export class MediaDefaultDto {
  @IsString() @Length(1, 120) assetId!: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) expectedRevision?: number
}
export class MediaResolveDto {
  @IsIn(mediaTypes) contentType!: string
  @IsOptional() @IsString() @Length(0, 120) categoryKey = 'generic'
  @IsOptional() @IsString() @Length(0, 120) explicitAssetId?: string
}
export class PageVisualsDto {
  @Type(() => Number) @IsInt() @Min(0) expectedRevision!: number
  @IsObject() value!: PublicPageVisualSetting
}
