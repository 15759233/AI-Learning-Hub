import { IsArray, IsIn, IsOptional, IsString, Length } from 'class-validator'
import { CreateContentDto, UpdateContentDto } from '../../common/content/content.dto'

export class CreateResourceDto extends CreateContentDto {
  @IsString() @Length(1, 80) category!: string
  @IsString() @Length(1, 20) format!: string
  @IsIn(['public', 'authenticated', 'private']) visibility!: 'public' | 'authenticated' | 'private'
  @IsOptional() @IsIn(['public', 'authenticated', 'restricted']) downloadPermission?: string
  @IsOptional() @IsString() difficulty?: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsString() fileId?: string
  @IsOptional() @IsString() themeId?: string
  @IsOptional() @IsString() courseId?: string
  @IsOptional() @IsString() labId?: string
}

export class UpdateResourceDto extends UpdateContentDto {
  @IsOptional() @IsString() @Length(1, 80) category?: string
  @IsOptional() @IsString() @Length(1, 20) format?: string
  @IsOptional() @IsIn(['public', 'authenticated', 'private']) visibility?: 'public' | 'authenticated' | 'private'
  @IsOptional() @IsIn(['public', 'authenticated', 'restricted']) downloadPermission?: string
  @IsOptional() @IsString() difficulty?: string
  @IsOptional() @IsArray() @IsString({ each: true }) tags?: string[]
  @IsOptional() @IsString() fileId?: string
  @IsOptional() @IsString() themeId?: string
  @IsOptional() @IsString() courseId?: string
  @IsOptional() @IsString() labId?: string
}
