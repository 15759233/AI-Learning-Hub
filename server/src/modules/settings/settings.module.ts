import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { SettingsController, SettingsOperationsController } from './settings.controller'
import { SettingsService } from './settings.service'

@Module({ imports: [AuthModule], controllers: [SettingsController, SettingsOperationsController], providers: [SettingsService] })
export class SettingsModule {}
