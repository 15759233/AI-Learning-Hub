import { Module } from '@nestjs/common'
import { ContentSupportModule } from '../../common/content/content-support.module'
import { AuthModule } from '../auth/auth.module'
import { AdminThemeController, PublicThemeController } from './theme.controller'
import { ThemeService } from './theme.service'

@Module({
  imports: [AuthModule, ContentSupportModule],
  controllers: [AdminThemeController, PublicThemeController],
  providers: [ThemeService],
  exports: [ThemeService],
})
export class ThemeModule {}
