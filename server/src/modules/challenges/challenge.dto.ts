import { Type } from 'class-transformer'
import { IsBoolean, IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator'
import { CreateContentDto, UpdateContentDto } from '../../common/content/content.dto'

export class CreateChallengeDto extends CreateContentDto {
  @IsString() @Length(1, 80) challengeType!: string
  @Type(() => Number) @IsInt() @Min(0) @Max(100) targetScore!: number
  @Type(() => Number) @IsInt() @Min(0) rewardPoints!: number
  @IsOptional() @IsDateString() startAt?: string
  @IsOptional() @IsDateString() endAt?: string
  @IsOptional() @IsBoolean() leaderboardEnabled?: boolean
  @IsOptional() @IsIn(['web-native', 'quiz-box-miniapp', 'quiz-box-webview', 'external-url']) integration?: string
}

export class UpdateChallengeDto extends UpdateContentDto {
  @IsOptional() @IsString() @Length(1, 80) challengeType?: string
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) targetScore?: number
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) rewardPoints?: number
  @IsOptional() @IsDateString() startAt?: string
  @IsOptional() @IsDateString() endAt?: string
  @IsOptional() @IsBoolean() leaderboardEnabled?: boolean
  @IsOptional() @IsIn(['web-native', 'quiz-box-miniapp', 'quiz-box-webview', 'external-url']) integration?: string
}

export class LinkQuestionBankDto {
  @IsString() questionBankId!: string
}

export class LinkPaperDto {
  @IsString() paperId!: string
}
