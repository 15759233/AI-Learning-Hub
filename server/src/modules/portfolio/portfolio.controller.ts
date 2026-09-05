import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common'
import { PortfolioService } from './portfolio.service'
import { AuthGuard } from '../auth/auth.guard'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import type { UpdatePortfolioDto } from './portfolio.dto'

@Controller('portfolio')
@UseGuards(AuthGuard)
export class PortfolioController {
  constructor(private readonly service: PortfolioService) {}

  @Post('convert/:postId')
  convert(@CurrentUser() user: AuthUser, @Param('postId') postId: string) { return this.service.convertPost(user.id, postId) }

  @Get()
  list(@CurrentUser() user: AuthUser) { return this.service.list(user.id) }

  @Get(':id')
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.detail(user.id, id) }

  @Patch(':id')
  update(@CurrentUser() user: AuthUser, @Param('id') id: string, @Body() input: UpdatePortfolioDto) { return this.service.update(user.id, id, input) }

  @Delete(':id')
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) { return this.service.remove(user.id, id) }
}