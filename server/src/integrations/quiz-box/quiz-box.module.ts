import { Module } from '@nestjs/common'
import { AuthModule } from '../../modules/auth/auth.module'
import { QuizBoxAdapter } from './quiz-box.adapter'
import { QuizBoxController } from './quiz-box.controller'
import { QuizBoxService } from './quiz-box.service'

@Module({ imports: [AuthModule], controllers: [QuizBoxController], providers: [QuizBoxAdapter, QuizBoxService], exports: [QuizBoxService] })
export class QuizBoxModule {}
