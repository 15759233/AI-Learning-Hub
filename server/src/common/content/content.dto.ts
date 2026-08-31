import { Type } from 'class-transformer'
import { IsInt, IsOptional, IsString, Length, Matches, Min } from 'class-validator'

export class CreateContentDto {
  @IsOptional() @IsString() @Length(1, 120) coverAssetId?: string | null
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
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder = 0
}

export class UpdateContentDto {
  @IsOptional() @IsString() @Length(1, 120) coverAssetId?: string | null
  @IsOptional()
  @IsString()
  @Length(2, 120)
  title?: string

  @IsOptional()
  @IsString()
  @Length(2, 500)
  summary?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  sortOrder?: number
}
