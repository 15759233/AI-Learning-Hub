import 'reflect-metadata'
import { ValidationPipe } from '@nestjs/common'
import { NestFactory } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger'
import { Reflector } from '@nestjs/core'
import cookieParser from 'cookie-parser'
import helmet from 'helmet'
import { AppModule } from './app.module'
import { ApiExceptionFilter } from './common/api-exception.filter'
import { ApiResponseInterceptor } from './common/api-response.interceptor'
import { OperationLogInterceptor } from './common/operation-log.interceptor'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true })
  const config = app.get(ConfigService)
  const trustedProxies = String(config.get('TRUSTED_PROXY_CIDRS') || '').split(',').map((value) => value.trim()).filter(Boolean)
  if (trustedProxies.length) app.getHttpAdapter().getInstance().set('trust proxy', trustedProxies)
  const origins = (config.get<string>('CORS_ORIGINS') || '').split(',').map((item) => item.trim()).filter(Boolean)
  if (!origins.length) throw new Error('CORS_ORIGINS 不能为空')

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }))
  app.use(cookieParser())
  app.enableCors({ origin: origins, credentials: true, methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] })
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }))
  app.useGlobalFilters(new ApiExceptionFilter())
  app.useGlobalInterceptors(app.get(OperationLogInterceptor), new ApiResponseInterceptor(app.get(Reflector)))

  const document = SwaggerModule.createDocument(app, new DocumentBuilder()
    .setTitle('AI 数智化学习平台 API')
    .setDescription('学生端、管理后台与《题盒》适配层的统一接口')
    .setVersion('1.0')
    .addBearerAuth()
    .build())
  SwaggerModule.setup('api/docs', app, document, { jsonDocumentUrl: 'api/docs-json' })

  await app.listen(Number(config.get('PORT') || 3000), '0.0.0.0')
}

void bootstrap()
