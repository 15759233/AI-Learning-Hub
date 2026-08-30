import { Body, Controller, Get, Ip, Patch, Post, Req, Res, UnauthorizedException, UseGuards } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import type { Request, Response } from 'express'
import { PrismaService } from '../../prisma/prisma.service'
import { AuthGuard } from './auth.guard'
import { AuthService } from './auth.service'
import { CurrentUser } from './current-user.decorator'
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, UpdateProfileDto, VerificationDto, WechatCodeDto } from './auth.dto'
import { RegistrationService } from './registration.service'
import type { AuthUser } from './auth.types'
import { durationMs } from './auth-ttl'

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, private readonly config: ConfigService, private readonly registration: RegistrationService) {}

  @Get('registration-config') registrationConfig() { return this.registration.configuration() }
  @Post('register')
  async register(@Body() input: RegisterDto, @Ip() ip: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.registration.register(input, ip)
    this.setRefreshCookie(response, result.refreshToken)
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn }
  }
  @Post('password/forgot') forgot(@Body() input: ForgotPasswordDto, @Ip() ip: string) { return this.registration.forgot(input.email, ip) }
  @Post('password/reset') reset(@Body() input: ResetPasswordDto, @Ip() ip: string) { return this.registration.reset(input.token, input.password, ip) }
  @Post('email/verify') verify(@Body() input: VerificationDto, @Ip() ip: string) { return this.registration.verifyEmail(input.token, ip) }

  private cookieSecure() {
    const configured = this.config.get<string>('COOKIE_SECURE')
    if (configured === 'true') return true
    if (configured === 'false') return false
    return this.config.get<string>('NODE_ENV') === 'production'
  }

  private setRefreshCookie(response: Response, token: string, remember = true) {
    response.cookie('refresh_token', token, {
      httpOnly: true,
      secure: this.cookieSecure(),
      sameSite: 'lax',
      path: '/api/v1/auth',
      maxAge: remember ? durationMs(
        this.config.get<string>('REFRESH_TOKEN_TTL') || `${this.config.get('REFRESH_TOKEN_DAYS') || '7'}d`,
        '7d',
      ) : undefined,
    })
    response.cookie('remember_session', remember ? 'yes' : 'no', { httpOnly: true, secure: this.cookieSecure(), sameSite: 'lax', path: '/api/v1/auth', ...(remember ? { maxAge: durationMs(this.config.get<string>('REFRESH_TOKEN_TTL') || '7d', '7d') } : {}) })
  }

  @Post('login')
  async login(@Body() input: LoginDto, @Ip() ip: string, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.login(input.email, input.password, `${ip}:${input.email.toLowerCase()}`, ip)
    this.setRefreshCookie(response, result.refreshToken, input.remember)
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn }
  }

  @Post('wechat/miniapp')
  async wechat(@Body() input: WechatCodeDto, @Res({ passthrough: true }) response: Response) {
    const result = await this.auth.wechatLogin(input.code)
    this.setRefreshCookie(response, result.refreshToken)
    return { user: result.user, accessToken: result.accessToken, expiresIn: result.expiresIn }
  }

  @Post('refresh')
  async refresh(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = request.cookies?.refresh_token as string | undefined
    if (!token) throw new UnauthorizedException('缺少刷新凭据')
    const result = await this.auth.refresh(token)
    this.setRefreshCookie(response, result.refreshToken, request.cookies?.remember_session !== 'no')
    return { accessToken: result.accessToken, expiresIn: result.expiresIn }
  }

  @Post('logout')
  async logout(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    await this.auth.logout(request.cookies?.refresh_token as string | undefined)
    response.clearCookie('refresh_token', {
      httpOnly: true,
      secure: this.cookieSecure(),
      sameSite: 'lax',
      path: '/api/v1/auth',
    })
    response.clearCookie('remember_session', { path: '/api/v1/auth', httpOnly: true, secure: this.cookieSecure(), sameSite: 'lax' })
    return { loggedOut: true }
  }
}

@Controller()
@UseGuards(AuthGuard)
export class MeController {
  constructor(private readonly prisma: PrismaService, private readonly auth: AuthService) {}

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user
  }

  @Patch('me')
  async update(@CurrentUser() user: AuthUser, @Body() input: UpdateProfileDto) {
    return this.prisma.user.update({ where: { id: user.id }, data: { displayName: input.displayName }, select: { id: true, email: true, displayName: true, status: true } })
  }

  @Get('me/identities')
  identities(@CurrentUser() user: AuthUser) {
    return this.prisma.authIdentity.findMany({ where: { userId: user.id }, select: { id: true, provider: true, createdAt: true } })
  }

  @Post('me/identities/wechat/miniapp')
  bindWechat(@CurrentUser() user: AuthUser, @Body() input: WechatCodeDto) {
    return this.auth.bindWechat(user.id, input.code)
  }
}
