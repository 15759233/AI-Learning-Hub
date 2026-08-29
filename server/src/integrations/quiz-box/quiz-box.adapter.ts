import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { QuizBoxAttempt, QuizBoxPort } from './quiz-box.interface'
import { QuizBoxMapper } from './quiz-box.mapper'

@Injectable()
export class QuizBoxAdapter implements QuizBoxPort {
  constructor(private readonly config: ConfigService) {}

  private settings() {
    const baseUrl = this.config.get<string>('QUIZ_BOX_BASE_URL')
    const clientId = this.config.get<string>('QUIZ_BOX_CLIENT_ID')
    const clientSecret = this.config.get<string>('QUIZ_BOX_CLIENT_SECRET')
    if (!baseUrl || !clientId || !clientSecret) throw new ServiceUnavailableException('《题盒》外部服务尚未配置')
    return { baseUrl: baseUrl.replace(/\/$/, ''), clientId, clientSecret }
  }

  async health() {
    const { baseUrl, clientId, clientSecret } = this.settings()
    const response = await fetch(`${baseUrl}/health`, { headers: { 'x-client-id': clientId, 'x-client-secret': clientSecret }, signal: AbortSignal.timeout(5000) })
    return { connected: response.ok, provider: 'quiz-box' }
  }

  async getAttempt(externalAttemptId: string): Promise<QuizBoxAttempt> {
    const { baseUrl, clientId, clientSecret } = this.settings()
    const response = await fetch(`${baseUrl}/attempts/${encodeURIComponent(externalAttemptId)}`, { headers: { 'x-client-id': clientId, 'x-client-secret': clientSecret }, signal: AbortSignal.timeout(8000) })
    if (!response.ok) throw new ServiceUnavailableException('《题盒》成绩读取失败')
    return QuizBoxMapper.attempt(await response.json())
  }
}
