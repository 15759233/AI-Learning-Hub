import { Type } from 'class-transformer'
import { IsArray, IsBoolean, IsDateString, IsDefined, IsIn, IsInt, IsObject, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator'

export class CreateChapterDto {
  @IsString() @Length(2, 120) title!: string
  @IsOptional() @IsString() description = ''
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class CreateLessonDto {
  @IsString() @Length(2, 120) title!: string
  @IsOptional() @IsString() summary = ''
  @IsOptional() @IsString() lessonType = 'article'
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) durationMinutes = 10
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class CreateBlockDto {
  @IsString()
  @IsIn(['heading', 'paragraph', 'image', 'video', 'code', 'diagram', 'key_points', 'quiz', 'resource', 'lab', 'note_entry', 'next_lesson'])
  blockType!: string

  @IsObject()
  content!: Record<string, unknown>

  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class CreateLabStepDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) stepKey!: string
  @IsString() @Length(2, 120) title!: string
  @IsString() @Length(2, 500) description!: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
  @IsOptional() @IsObject() instruction: Record<string, unknown> = {}
  @IsOptional() @IsObject() validator: Record<string, unknown> = {}
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) score = 0
}

export class UpsertPathDto {
  @IsString() @Length(2, 120) name!: string
  @IsOptional() @IsString() description = ''
  @IsArray() stages!: Array<{ name: string; stageType: string; description?: string; targetType?: string; targetId?: string }>
}

export class CreateQuestionBankDto {
  @IsString() @Length(2, 120) name!: string
}

export class CreateQuestionDto {
  @IsString() bankId!: string
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

export class LinkQuestionBankDto {
  @IsString() questionBankId!: string
}

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

export class CreateSchoolDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) code!: string
  @IsString() @Length(2, 120) name!: string
}

export class CreateDepartmentDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) code!: string
  @IsString() @Length(2, 120) name!: string
}

export class ScheduleArticleDto {
  @IsDateString() scheduledAt!: string
}

export class ArticleRecommendationsDto {
  @IsArray()
  items!: Array<{ positionKey: string; sortOrder?: number; startAt?: string; endAt?: string; enabled?: boolean }>
}

export class CreateNotificationDto {
  @IsString() @Length(2, 120) title!: string
  @IsString() @Length(2, 2000) content!: string
  @IsOptional() @IsString() audience = 'all'
}

export class CreateHomepageItemDto {
  @IsString() @IsIn(['theme', 'course', 'lab', 'resource', 'article', 'challenge']) targetType!: string
  @IsString() targetId!: string
  @IsOptional() @IsString() titleOverride?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class ReorderDto {
  @IsArray()
  items!: Array<{ id: string; sortOrder: number }>
}

export class CreateHomepageModuleDto {
  @IsString() @Matches(/^[a-z0-9]+(?:_[a-z0-9]+)*$/) moduleKey!: string
  @IsString() @Length(2, 120) moduleName!: string
  @IsOptional() @IsString() moduleType = 'content_grid'
  @IsOptional() @IsObject() config: Record<string, unknown> = {}
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class UpdateLabToolsDto {
  @IsArray()
  tools!: Array<{ name: string; toolType: string; description?: string; safeConfig?: Record<string, unknown>; enabled?: boolean }>
}

export class CreatePaperDto {
  @IsString() @Length(2, 120) name!: string
  @IsOptional() @IsString() description = ''
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) durationMinutes = 30
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) totalScore = 100
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) passScore = 60
}

export class PaperQuestionsDto {
  @IsArray()
  items!: Array<{ questionId: string; sortOrder: number; score: number }>
}

export class LinkPaperDto {
  @IsString() paperId!: string
}

export class RecommendationRulesDto {
  @IsObject()
  value!: Record<string, unknown>
}
