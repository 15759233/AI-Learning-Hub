import { IsArray, IsDateString, IsEnum, IsInt, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import { Type } from 'class-transformer'
import { FavoriteTargetType } from '@prisma/client'

export class FavoriteDto {
  @IsEnum(FavoriteTargetType)
  targetType!: FavoriteTargetType

  @IsString()
  @Length(1, 80)
  targetId!: string
}

export class ProgressDto {
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress!: number
}

export class NoteDto {
  @IsString()
  @Length(1, 5000)
  content!: string
}

export class LabActionDto {
  @IsString()
  action!: 'start' | 'next' | 'complete' | 'stop'

  @IsOptional()
  @IsObject()
  payload?: Record<string, unknown>
}

export class CreatePlanDto {
  @IsString()
  @Length(2, 80)
  title!: string

  @IsDateString()
  targetDate!: string
}

export class UpdatePlanDto {
  @IsOptional()
  @IsString()
  status?: string

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(100)
  progress?: number
}

export class SubmitAssessmentDto {
  @IsArray()
  answers!: Array<{ questionId: string; answer: unknown }>
}
