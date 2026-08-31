import { Type } from 'class-transformer'
import { IsArray, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import { CreateContentDto, UpdateContentDto } from '../../common/content/content.dto'

export class CreateCourseDto extends CreateContentDto {
  @IsOptional() @IsString() themeId?: string
  @IsOptional() @IsString() @Length(0, 120) category?: string
  @IsOptional() @IsString() @Length(0, 40) level?: string
  @IsOptional() @IsString() @Length(0, 40) mode?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1000) hours?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60_000) durationMinutes?: number
  @IsOptional() @IsString() @Length(0, 120) instructorName?: string
  @IsOptional() @IsString() @Length(0, 160) instructorTitle?: string
  @IsOptional() @IsString() @Length(0, 160) certificate?: string
}

export class UpdateCourseDto extends UpdateContentDto {
  @IsOptional() @IsString() themeId?: string
  @IsOptional() @IsString() @Length(0, 120) category?: string
  @IsOptional() @IsString() @Length(0, 40) level?: string
  @IsOptional() @IsString() @Length(0, 40) mode?: string
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(1000) hours?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(60_000) durationMinutes?: number
  @IsOptional() @IsString() @Length(0, 120) instructorName?: string
  @IsOptional() @IsString() @Length(0, 160) instructorTitle?: string
  @IsOptional() @IsString() @Length(0, 160) certificate?: string
}

export class CreateChapterDto {
  @IsString() @Length(2, 120) title!: string
  @IsOptional() @IsString() description = ''
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class UpdateChapterDto {
  @IsOptional() @IsString() @Length(2, 120) title?: string
  @IsOptional() @IsString() description?: string
}

export class CreateLessonDto {
  @IsString() @Length(2, 120) title!: string
  @IsOptional() @IsString() summary = ''
  @IsOptional() @IsString() lessonType = 'article'
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) durationMinutes = 10
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class UpdateLessonDto {
  @IsOptional() @IsString() @Length(2, 120) title?: string
  @IsOptional() @IsString() summary?: string
  @IsOptional() @IsString() lessonType?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(600) durationMinutes?: number
}

export class CreateBlockDto {
  @IsString()
  @IsIn(['heading', 'paragraph', 'image', 'video', 'code', 'diagram', 'key_points', 'quiz', 'resource', 'lab', 'note_entry', 'next_lesson'])
  blockType!: string
  @IsObject() content!: Record<string, unknown>
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) sortOrder = 0
}

export class UpdateBlockDto {
  @IsOptional() @IsString()
  @IsIn(['heading', 'paragraph', 'image', 'video', 'code', 'diagram', 'key_points', 'quiz', 'resource', 'lab', 'note_entry', 'next_lesson'])
  blockType?: string
  @IsOptional() @IsObject() content?: Record<string, unknown>
}

export class ReorderCourseDto {
  @IsArray() items!: Array<{ id: string; sortOrder: number }>
}

export class CourseRelationsDto {
  @IsArray() @IsString({ each: true }) resourceIds!: string[]
  @IsArray() @IsString({ each: true }) labIds!: string[]
}
