import { IsIn, IsOptional, IsString, Length } from 'class-validator'

export class UpdatePortfolioDto {
  @IsOptional() @IsString() @Length(1, 120) title?: string
  @IsOptional() @IsString() @Length(0, 500) summary?: string
  @IsOptional() @IsIn(['public', 'private']) visibility?: 'public' | 'private'
}