import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { QuestionController } from './question.controller'

@Module({
  imports: [AuthModule],
  controllers: [QuestionController],
})
export class QuestionModule {}
