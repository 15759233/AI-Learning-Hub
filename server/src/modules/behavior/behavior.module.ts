import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { BehaviorController, AdminUserController } from './behavior.controller'
import { BehaviorService } from './behavior.service'
import { SignalsModule } from '../signals/signals.module'

@Module({ imports: [AuthModule, SignalsModule], controllers: [BehaviorController, AdminUserController], providers: [BehaviorService] })
export class BehaviorModule {}
