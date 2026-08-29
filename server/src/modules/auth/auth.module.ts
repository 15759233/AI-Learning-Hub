import { Module } from '@nestjs/common'
import { JwtModule } from '@nestjs/jwt'
import { AuthController, MeController } from './auth.controller'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { RolesGuard } from './roles.guard'
import { PermissionsGuard } from './permissions.guard'
import { WechatModule } from '../../integrations/wechat/wechat.module'

@Module({
  imports: [JwtModule.register({}), WechatModule],
  controllers: [AuthController, MeController],
  providers: [AuthService, AuthGuard, RolesGuard, PermissionsGuard],
  exports: [JwtModule, AuthGuard, RolesGuard, PermissionsGuard, AuthService],
})
export class AuthModule {}
