import { Type } from 'class-transformer'
import { PublishStatus } from '@prisma/client'
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator'

export class PageQueryDto {
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page = 1
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) pageSize = 20
  @IsOptional() @IsString() keyword = ''
  @IsOptional() @IsEnum(PublishStatus) status?: PublishStatus
  @IsOptional() @IsIn(['demo_seed', 'admin_created', 'imported']) dataOrigin?: string
}
