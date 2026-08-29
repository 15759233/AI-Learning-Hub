import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BehaviorController, AdminUserController } from './behavior.controller'
import { BehaviorService } from './behavior.service'

@Module({ imports: [AuthModule], controllers: [BehaviorController, AdminUserController], providers: [BehaviorService] })
export class BehaviorModule {}
