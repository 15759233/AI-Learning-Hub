import { Transform } from 'class-transformer'
import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'
import { CommunityPostType } from '@prisma/client'
import { PageQuery, queryBoolean } from '../users/users.dto'
export class AdminCommunityQuery extends PageQuery {
  @IsOptional() @IsIn(['all', ...Object.values(CommunityPostType)]) type?: CommunityPostType | 'all'
  @IsOptional() @IsIn(Object.values(CommunityPostType)) postType?: CommunityPostType
  @IsOptional() @IsIn(['public', 'school']) visibility?: 'public' | 'school'
  @IsOptional() @IsString() @MaxLength(100) authorId?: string
  @IsOptional() @IsString() @MaxLength(100) postId?: string
  @IsOptional() @IsString() @MaxLength(100) topicId?: string
  @IsOptional() @IsString() @MaxLength(100) schoolId?: string
  @IsOptional() @Transform(queryBoolean) @IsBoolean() hasMedia?: boolean
  @IsOptional() @Transform(queryBoolean) @IsBoolean() reported?: boolean
  @IsOptional() @IsIn(['createdAt', 'publishedAt', 'editedAt']) sortBy: 'createdAt' | 'publishedAt' | 'editedAt' = 'createdAt'
}
