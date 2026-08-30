import { ConflictException, HttpException, Injectable, ServiceUnavailableException, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { JwtService } from '@nestjs/jwt'
import { compare } from 'bcryptjs'
import { createHash, randomBytes } from 'node:crypto'
import { WechatMiniappService } from '../../integrations/wechat/wechat-miniapp.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { AuthUser } from './auth.types'
import { durationMs } from './auth-ttl'
import { Prisma } from '@prisma/client'
import { authUserDto, authUserInclude } from './auth.mapper'

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly wechat: WechatMiniappService,
  ) {}

  async login(email: string, password: string, clientKey: string, ip: string) {
    email = email.trim().toLowerCase()
    const identityKey = hashToken(clientKey)
    const current = await this.prisma.loginThrottle.findUnique({ where: { identityKey } })
    if (current?.blockedUntil && current.blockedUntil > new Date()) throw new HttpException('登录失败次数过多，请稍后再试', 429)
    const user = await this.prisma.user.findUnique({
      where: { email },
      include: authUserInclude,
    })
    const passwordValid = !!user?.passwordHash && await compare(password, user.passwordHash)
    if (!user || !passwordValid || user.status !== 'active') {
      const failures = (current?.expiresAt && current.expiresAt > new Date() ? current.failures : 0) + 1
      await this.prisma.loginThrottle.upsert({
        where: { identityKey },
        update: {
          failures,
          blockedUntil: failures >= 5 ? new Date(Date.now() + 60_000) : null,
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
        create: {
          identityKey,
          failures,
          blockedUntil: failures >= 5 ? new Date(Date.now() + 60_000) : null,
          expiresAt: new Date(Date.now() + 15 * 60_000),
        },
      })
      await this.prisma.loginLog.create({ data: { userId: user?.id, email, ipHash: hashToken(ip), result: 'failed' } })
      throw new UnauthorizedException(passwordValid && user?.status !== 'active' ? '账号已禁用，请联系管理员' : '账号或密码错误')
    }
    await this.prisma.loginThrottle.deleteMany({ where: { identityKey } })
    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } })
    await this.prisma.loginLog.create({ data: { userId: user.id, email, ipHash: hashToken(ip), result: 'success' } })
    const profile = authUserDto(user)
    return { user: profile, ...(await this.createSession(profile)) }
  }

  async createSession(user: AuthUser, tx: Prisma.TransactionClient = this.prisma) {
    const accessTtl = this.config.get<string>('ACCESS_TOKEN_TTL') || '15m'
    const accessToken = await this.jwt.signAsync(user, {
      secret: this.config.getOrThrow('JWT_SECRET'),
      expiresIn: Math.floor(durationMs(accessTtl, '15m') / 1000),
    })
    const refreshToken = randomBytes(48).toString('base64url')
    const ttl = this.config.get('REFRESH_TOKEN_TTL') || `${this.config.get('REFRESH_TOKEN_DAYS') || '7'}d`
    await tx.refreshToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + durationMs(ttl, '7d')),
      },
    })
    return { accessToken, refreshToken, expiresIn: Math.floor(durationMs(accessTtl, '15m') / 1000) }
  }

  async refresh(refreshToken: string) {
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash: hashToken(refreshToken) },
      include: {
        user: {
          include: authUserInclude,
        },
      },
    })
    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.status !== 'active') {
      throw new UnauthorizedException('刷新凭据已失效')
    }
    return this.prisma.$transaction(async (tx) => {
      const claimed = await tx.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } })
      if (!claimed.count) throw new UnauthorizedException('刷新凭据已失效')
      return this.createSession(authUserDto(stored.user), tx)
    })
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) return
    await this.prisma.refreshToken.updateMany({ where: { tokenHash: hashToken(refreshToken), revokedAt: null }, data: { revokedAt: new Date() } })
  }

  async wechatLogin(code: string) {
    const external = await this.wechat.exchange(code)
    const identity = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUid: { provider: 'wechat_miniapp', providerUid: external.providerUid } },
      include: {
        user: {
          include: authUserInclude,
        },
      },
    })
    if (identity) {
      if (identity.user.status !== 'active') throw new UnauthorizedException('账号已禁用')
      const profile = authUserDto(identity.user)
      return { user: profile, ...(await this.createSession(profile)) }
    }
    const role = await this.prisma.role.findUnique({ where: { code: 'student' } })
    if (!role) throw new ServiceUnavailableException('学生角色尚未初始化')
    const suffix = hashToken(external.providerUid).slice(0, 16)
    const user = await this.prisma.user.create({
      data: {
        username: `wx_${suffix}`,
        email: `${suffix}@wechat.local`,
        displayName: `微信用户${suffix.slice(0, 4)}`,
        passwordHash: null,
        identities: { create: { provider: 'wechat_miniapp', providerUid: external.providerUid, metadata: external.unionid ? { unionid: external.unionid } : {} } },
        userRoles: { create: { roleId: role.id } },
      },
      include: authUserInclude,
    })
    const profile = authUserDto(user)
    return { user: profile, ...(await this.createSession(profile)) }
  }

  async bindWechat(userId: string, code: string) {
    const external = await this.wechat.exchange(code)
    const existing = await this.prisma.authIdentity.findUnique({
      where: { provider_providerUid: { provider: 'wechat_miniapp', providerUid: external.providerUid } },
    })
    if (existing && existing.userId !== userId) throw new ConflictException('该微信身份已绑定其他账号')
    return this.prisma.authIdentity.upsert({
      where: { userId_provider: { userId, provider: 'wechat_miniapp' } },
      update: { providerUid: external.providerUid, metadata: external.unionid ? { unionid: external.unionid } : {} },
      create: { userId, provider: 'wechat_miniapp', providerUid: external.providerUid, metadata: external.unionid ? { unionid: external.unionid } : {} },
      select: { id: true, provider: true, createdAt: true },
    })
  }
}
