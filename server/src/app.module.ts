import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppController } from './app.controller'
import { RequestIdMiddleware } from './common/request-id.middleware'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { CatalogModule } from './modules/catalog/catalog.module'
import { BehaviorModule } from './modules/behavior/behavior.module'
import { StorageModule } from './modules/storage/storage.module'
import { QuizBoxModule } from './integrations/quiz-box/quiz-box.module'
import { OperationLogInterceptor } from './common/operation-log.interceptor'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    BehaviorModule,
    CatalogModule,
    StorageModule,
    QuizBoxModule,
  ],
  controllers: [AppController],
  providers: [OperationLogInterceptor],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*')
  }
}
