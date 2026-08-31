import { Type } from 'class-transformer'
import { IsArray, IsDateString, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import { CreateContentDto, UpdateContentDto } from '../../common/content/content.dto'

export class CreateArticleDto extends CreateContentDto {
  @IsString() @Length(1, 80) category!: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsString() @Length(0, 120) author?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) readMinutes?: number
  @IsOptional() @IsArray() blocks?: Array<Record<string, unknown>>
}

export class UpdateArticleDto extends UpdateContentDto {
  @IsOptional() @IsString() @Length(1, 80) category?: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsString() @Length(0, 120) author?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(10_000) readMinutes?: number
  @IsOptional() @IsArray() blocks?: Array<Record<string, unknown>>
}

export class ScheduleArticleDto {
  @IsDateString() scheduledAt!: string
}

export class ArticleRecommendationsDto {
  @IsArray()
  items!: Array<{
    positionKey: 'frontier_hero' | 'frontier_weekly' | 'frontier_sidebar' | 'homepage_news' | 'channel_featured'
    sortOrder?: number
    startAt?: string
    endAt?: string
    enabled?: boolean
  }>
}
