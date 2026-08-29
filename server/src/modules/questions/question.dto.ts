import { Type } from 'class-transformer'
import { IsArray, IsDefined, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'

export class CreateQuestionBankDto {
  @IsString() @Length(2, 120) name!: string
}

export class CreateQuestionDto {
  @IsString() bankId!: string
  @IsString() knowledgePointId!: string
  @IsString() @IsIn(['single', 'multiple', 'true_false', 'short_answer', 'code']) questionType!: 'single' | 'multiple' | 'true_false' | 'short_answer' | 'code'
  @IsString() difficulty!: string
  @IsString() @Length(2, 1000) stem!: string
  @IsArray() options: unknown[] = []
  @IsDefined() standardAnswer!: unknown
  @IsString() analysis = ''
}

export class UpdateQuestionDto {
  @IsOptional() @IsString() @Length(2, 1000) stem?: string
  @IsOptional() @IsArray() options?: unknown[]
  @IsOptional() standardAnswer?: unknown
  @IsOptional() @IsString() analysis?: string
  @IsOptional() @IsString() @IsIn(['draft', 'reviewing', 'published', 'archived']) status?: 'draft' | 'reviewing' | 'published' | 'archived'
}

export class CreatePaperDto {
  @IsString() @Length(2, 120) name!: string
  @IsOptional() @IsString() description = ''
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) durationMinutes = 30
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) totalScore = 100
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) passScore = 60
}

export class PaperQuestionsDto {
  @IsArray() items!: Array<{ questionId: string; sortOrder: number; score: number }>
}
