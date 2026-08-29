import { Type } from 'class-transformer'
import { IsBoolean, IsInt, IsObject, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'

export class CreateGrowthRuleDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) code!: string
  @IsString() @Length(2, 120) name!: string
  @IsString() @Length(2, 500) description!: string
  @IsObject() rule!: Record<string, unknown>
}

export class UpdateGrowthRuleDto {
  @IsOptional() @IsString() @Length(2, 120) name?: string
  @IsOptional() @IsString() @Length(2, 500) description?: string
  @IsOptional() @IsObject() rule?: Record<string, unknown>
  @IsOptional() @IsBoolean() enabled?: boolean
}

export class UpdateGrowthModuleDto {
  @IsOptional() @IsString() @Length(2, 120) title?: string
  @IsOptional() @IsString() description?: string
  @IsOptional() @IsBoolean() enabled?: boolean
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) displayLimit?: number
}

export class RecommendationRulesDto {
  @IsObject() value!: Record<string, unknown>
}
