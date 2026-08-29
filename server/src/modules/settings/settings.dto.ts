import { Type } from 'class-transformer'
import { IsArray, IsDefined, IsIn, IsInt, IsOptional, IsString, Length, Matches, Min, ValidateNested } from 'class-validator'

export class UpdateSettingDto {
  @IsString()
  @IsIn(['platform_name', 'platform_subtitle', 'upload_max_mb', 'allowed_file_types', 'session_minutes', 'notification_enabled', 'allowed_login_domains'])
  key!: string
  @IsDefined() value!: unknown
}

export class BatchSettingItemDto extends UpdateSettingDto {}

export class BatchSettingsDto {
  @Type(() => Number) @IsInt() @Min(1) version!: number
  @IsArray() @ValidateNested({ each: true }) @Type(() => BatchSettingItemDto) items!: BatchSettingItemDto[]
}

export class CreateSchoolDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) code!: string
  @IsString() @Length(2, 120) name!: string
}

export class CreateDepartmentDto {
  @IsString() @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/) code!: string
  @IsString() @Length(2, 120) name!: string
}

export class CreateNotificationDto {
  @IsString() @Length(2, 120) title!: string
  @IsString() @Length(2, 2000) content!: string
  @IsOptional() @IsString() audience = 'all'
}
