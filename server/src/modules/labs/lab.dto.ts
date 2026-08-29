import { Type } from 'class-transformer'
import { IsArray, IsEnum, IsInt, IsObject, IsOptional, IsString, IsUrl, Length, Max, Min, ValidateIf } from 'class-validator'
import { LabType } from '@prisma/client'
import { CreateContentDto, UpdateContentDto } from '../../common/content/content.dto'

export class CreateLabDto extends CreateContentDto {
  @IsEnum(LabType) labType!: LabType
  @IsOptional() @IsString() @Length(0, 120) category?: string
  @IsOptional() @IsString() @Length(0, 40) level?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60_000) durationMinutes?: number
  @IsOptional() @ValidateIf((_, value) => value !== '') @IsUrl({ require_tld: false }) cover?: string
  @IsOptional() @IsString() @Length(0, 2000) objective?: string
  @IsOptional() @IsString() @Length(0, 5000) task?: string
  @IsOptional() @IsArray() @IsString({ each: true }) hints?: string[]
  @IsOptional() @IsArray() scoring?: Array<{ label: string; points: number }>
  @IsOptional() @IsString() @Length(0, 500) resultSubmission?: string
  @IsOptional() @IsObject() typeConfig?: Record<string, unknown>
}

export class UpdateLabDto extends UpdateContentDto {
  @IsOptional() @IsEnum(LabType) labType?: LabType
  @IsOptional() @IsString() @Length(0, 120) category?: string
  @IsOptional() @IsString() @Length(0, 40) level?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60_000) durationMinutes?: number
  @IsOptional() @ValidateIf((_, value) => value !== '') @IsUrl({ require_tld: false }) cover?: string
  @IsOptional() @IsString() @Length(0, 2000) objective?: string
  @IsOptional() @IsString() @Length(0, 5000) task?: string
  @IsOptional() @IsArray() @IsString({ each: true }) hints?: string[]
  @IsOptional() @IsArray() scoring?: Array<{ label: string; points: number }>
  @IsOptional() @IsString() @Length(0, 500) resultSubmission?: string
  @IsOptional() @IsObject() typeConfig?: Record<string, unknown>
}

export class CreateLabStepDto {
  @IsString() stepKey!: string
  @IsString() @Length(2, 120) title!: string
  @IsString() @Length(2, 500) description!: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
  @IsOptional() @IsObject() instruction: Record<string, unknown> = {}
  @IsOptional() @IsObject() validator: Record<string, unknown> = {}
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) score = 0
}

export class UpdateLabStepDto {
  @IsOptional() @IsString() @Length(2, 120) title?: string
  @IsOptional() @IsString() @Length(2, 500) description?: string
  @IsOptional() @IsObject() instruction?: Record<string, unknown>
  @IsOptional() @IsObject() validator?: Record<string, unknown>
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) score?: number
}

export class ReorderLabDto {
  @IsArray() items!: Array<{ id: string; sortOrder: number }>
}

export class UpdateLabToolsDto {
  @IsArray()
  tools!: Array<{ name: string; toolType: string; description?: string; safeConfig?: Record<string, unknown>; enabled?: boolean }>
}

export class LabResourcesDto {
  @IsArray() @IsString({ each: true }) resourceIds!: string[]
}
