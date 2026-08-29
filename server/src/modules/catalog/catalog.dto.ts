import { IsDefined, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'

export class PageQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page = 1

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize = 20

  @IsOptional()
  @IsString()
  keyword = ''

  @IsOptional()
  @IsString()
  status?: string
}

export class CreateCatalogDto {
  @IsString()
  @Length(2, 80)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, { message: 'slug 仅支持小写字母、数字和连字符' })
  slug!: string

  @IsString()
  @Length(2, 120)
  title!: string

  @IsString()
  @Length(2, 500)
  summary!: string

  @IsOptional()
  @IsObject()
  payload: Record<string, unknown> = {}

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder = 0
}

export class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  @Length(2, 120)
  title?: string

  @IsOptional()
  @IsString()
  @Length(2, 500)
  summary?: string

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number
}

export class UpdateHomepageModuleDto {
  @IsOptional()
  enabled?: boolean

  @IsOptional()
  @IsObject()
  config?: Record<string, unknown>

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  sortOrder?: number
}

export class UpdateSettingDto {
  @IsString()
  @IsIn(['platform_name', 'platform_subtitle', 'upload_max_mb', 'allowed_file_types', 'session_minutes'])
  key!: string

  @IsDefined()
  value!: unknown
}
