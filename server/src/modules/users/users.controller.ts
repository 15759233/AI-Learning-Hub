import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { AuthGuard } from '../auth/auth.guard'
import { PermissionsGuard } from '../auth/permissions.guard'
import { Permissions } from '../auth/permissions.decorator'
import { CurrentUser } from '../auth/current-user.decorator'
import type { AuthUser } from '../auth/auth.types'
import { UsersService } from './users.service'
import { UserQuery, UserReasonDto, UserStatusUpdateDto, UserUpdateDto } from './users.dto'
import { PrismaService } from '../../prisma/prisma.service'

@Controller('admin/users')
@UseGuards(AuthGuard, PermissionsGuard)
@Permissions('user.read')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly prisma: PrismaService) {}
  @Get() list(@Query() query: UserQuery) { return this.users.list(query) }
  @Get('growth-list') @Permissions('growth.read') growthList(@Query() query: UserQuery) { return this.users.list({ ...query, role: 'student' }) }
  @Get('export') @Permissions('user.export')
  async export(@CurrentUser() actor: AuthUser, @Query() query: UserQuery) {
    // 逐页导出，明确返回 total；不把全库敏感资料一次性载入进程或浏览器。
    const result = await this.users.list(query)
    await this.prisma.auditLog.create({ data: { actorId: actor.id, action: 'user_export', targetType: 'user', targetId: 'page', details: { page: query.page, pageSize: query.pageSize, count: result.items.length } } })
    return result
  }
  @Get('options') options() { return this.prisma.$transaction([
    this.prisma.school.findMany({ where: { status: 'active' }, select: { id: true, name: true, departments: { select: { id: true, name: true } } } }),
    this.prisma.role.findMany({ select: { code: true, name: true } }),
  ]).then(([schools, roles]) => ({ schools, roles })) }
  @Get(':id') detail(@Param('id') id: string) { return this.users.detail(id) }
  @Patch(':id') @Permissions('user.write')
  update(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() input: UserUpdateDto) { return this.users.update(actor, id, input) }
  @Patch(':id/status') @Permissions('user.write')
  status(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() input: UserStatusUpdateDto) { return this.users.status(actor, id, input) }
  @Post(':id/reset-onboarding') @Permissions('user.write')
  reset(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() input: UserReasonDto) { return this.users.action(actor, id, 'reset_onboarding', input.reason) }
  @Post(':id/revoke-sessions') @Permissions('user.session.revoke')
  revoke(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() input: UserReasonDto) { return this.users.action(actor, id, 'revoke_sessions', input.reason) }
  @Post(':id/reset-password') @Permissions('user.write')
  resetPassword(@CurrentUser() actor: AuthUser, @Param('id') id: string, @Body() input: UserReasonDto) { return this.users.resetPassword(actor, id, input.reason) }
}
