import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../../modules/auth/auth.guard'
import { Permissions } from '../../modules/auth/permissions.decorator'
import { PermissionsGuard } from '../../modules/auth/permissions.guard'
import { QuizBoxService } from './quiz-box.service'

@Controller('admin/integrations/quiz-box')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions('question.write')
export class QuizBoxController {
  constructor(private readonly quizBox: QuizBoxService) {}

  @Get('health')
  health() { return this.quizBox.health() }

  @Post('attempts/:id/import')
  import(@Param('id') id: string) { return this.quizBox.importAttempt(id) }
}
