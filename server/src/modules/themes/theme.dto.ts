import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsHexColor, IsIn, IsObject, IsOptional, IsString, Length, Matches, ValidateNested } from 'class-validator'
import { CreateContentDto, UpdateContentDto } from '../../common/content/content.dto'

export class CreateThemeDto extends CreateContentDto {
  @IsOptional() @IsString() @Length(0, 160) subtitle?: string
  @IsOptional() @IsString() @Length(0, 2000) introduction?: string
  @IsOptional() @IsString() @Length(0, 120) icon?: string
  @IsOptional() @IsHexColor() accent?: string
  @IsOptional() @IsBoolean() recommended?: boolean
  @IsOptional() @IsArray() @IsString({ each: true }) recommendedCourseIds?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) relatedLabIds?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) relatedResourceIds?: string[]
}

export class UpdateThemeDto extends UpdateContentDto {
  @IsOptional() @IsString() @Length(0, 160) subtitle?: string
  @IsOptional() @IsString() @Length(0, 2000) introduction?: string
  @IsOptional() @IsString() @Length(0, 120) icon?: string
  @IsOptional() @IsHexColor() accent?: string
  @IsOptional() @IsBoolean() recommended?: boolean
  @IsOptional() @IsArray() @IsString({ each: true }) recommendedCourseIds?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) relatedLabIds?: string[]
  @IsOptional() @IsArray() @IsString({ each: true }) relatedResourceIds?: string[]
}

export class PathStageDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) stageKey!: string
  @IsString() @Length(2, 120) name!: string
  @IsString() @IsIn(['learning', 'practice', 'project', 'assessment']) stageType!: string
  @IsOptional() @IsString() description = ''
  @IsOptional() @IsObject() unlockRule: Record<string, unknown> = {}
  @IsOptional() @IsString() @IsIn(['course', 'lab', 'project']) targetType?: string
  @IsOptional() @IsString() targetId?: string
}

export class UpsertPathDto {
  @IsString() @Length(2, 120) name!: string
  @IsOptional() @IsString() description = ''
  @IsArray() @ValidateNested({ each: true }) @Type(() => PathStageDto) stages!: PathStageDto[]
}
