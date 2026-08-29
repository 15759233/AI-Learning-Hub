import { Module } from '@nestjs/common'
import { AuthModule } from '../auth/auth.module'
import { GrowthController } from './growth.controller'

@Module({
  imports: [AuthModule],
  controllers: [GrowthController],
})
export class GrowthModule {}
