import { IsArray, IsBoolean, IsDateString, IsDefined, IsEnum, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Max, Min, ValidateNested } from 'class-validator'
import { Type } from 'class-transformer'
import { FavoriteTargetType } from '@prisma/client'

export class FavoriteDto {
  @IsEnum(FavoriteTargetType)
  targetType!: FavoriteTargetType

  @IsString()
  @Length(1, 80)
  targetId!: string
}

export class LessonProgressDto {
  @IsBoolean()
  completed!: boolean

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(86_400)
  positionSeconds = 0
}

export class NoteDto {
  @IsString()
  @Length(1, 5000)
  content!: string
}

export class LabActionDto {
  @IsString()
  @IsIn(['run', 'command', 'input', 'select_tool', 'connect', 'confirm', 'submit_step', 'stop', 'reset'])
  action!: 'run' | 'command' | 'input' | 'select_tool' | 'connect' | 'confirm' | 'submit_step' | 'stop' | 'reset'

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
  @ValidateNested({ each: true })
  @Type(() => AssessmentAnswerDto)
  answers!: AssessmentAnswerDto[]
}

export class AssessmentAnswerDto {
  @IsString()
  questionId!: string

  @IsDefined()
  answer!: unknown
}

export class ViewEventDto {
  @IsString()
  @IsIn(['resource', 'article'])
  targetType!: 'resource' | 'article'

  @IsString()
  @Length(1, 120)
  targetSlug!: string
}
