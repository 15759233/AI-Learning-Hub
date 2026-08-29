import { Type } from 'class-transformer'
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Min } from 'class-validator'
import { ReorderDto } from '../../common/content/reorder.dto'

export { ReorderDto }

export class CreateHomepageItemDto {
  @IsString() @IsIn(['theme', 'course', 'lab', 'resource', 'article', 'challenge']) targetType!: string
  @IsString() targetId!: string
  @IsOptional() @IsString() titleOverride?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class CreateHomepageModuleDto {
  @IsString()
  @IsIn([
    'hero_banner', 'ability_method', 'theme_direction', 'weekly_featured',
    'featured_labs', 'maker_projects', 'frontier_news', 'resource_tools',
    'weekly_challenge', 'growth_summary', 'student_activity', 'bottom_action',
  ])
  moduleKey!: string
  @IsString() @Length(2, 120) moduleName!: string
  @IsOptional() @IsString() moduleType = 'content_grid'
  @IsOptional() @IsObject() config: Record<string, unknown> = {}
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class UpdateHomepageModuleDto {
  @IsOptional() @IsBoolean() enabled?: boolean
  @IsOptional() @IsObject() config?: Record<string, unknown>
  @IsOptional() @Type(() => Number) @IsInt() sortOrder?: number
}
