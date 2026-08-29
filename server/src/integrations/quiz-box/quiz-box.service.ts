import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { QuizBoxAdapter } from './quiz-box.adapter'

@Injectable()
export class QuizBoxService {
  constructor(private readonly adapter: QuizBoxAdapter, private readonly prisma: PrismaService) {}

  health() {
    return this.adapter.health()
  }

  async importAttempt(externalAttemptId: string) {
    const attempt = await this.adapter.getAttempt(externalAttemptId)
    await this.prisma.syncJob.create({
      data: {
        provider: 'quiz-box',
        jobType: 'attempt_import',
        status: 'received',
        summary: { externalAttemptId: attempt.externalAttemptId, submittedAt: attempt.submittedAt },
        finishedAt: new Date(),
      },
    })
    return { imported: true, externalAttemptId: attempt.externalAttemptId }
  }
}
