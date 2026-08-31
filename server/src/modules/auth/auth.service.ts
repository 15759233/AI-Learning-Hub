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
import { actionEvent, lockUser, rateLimit } from '../../common/persistence'

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
    await rateLimit(this.prisma, clientKey, 'login_attempt', 30, 15 * 60000)
    const current = await this.prisma.loginThrottle.findUnique({ where: { identityKey } })
    if (current?.blockedUntil && current.blockedUntil > new Date()) throw new HttpException('登录失败次数过多，请稍后再试', 429)
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
      include: authUserInclude,
    })
    const passwordValid = !!user?.passwordHash && await compare(password, user.passwordHash)
    if (!user || !passwordValid || user.status !== 'active') {
      await this.prisma.$executeRaw`INSERT INTO login_throttles(identity_key,failures,expires_at)
        VALUES(${identityKey},1,NOW()+INTERVAL '15 minutes')
        ON CONFLICT(identity_key) DO UPDATE SET
        failures=CASE WHEN login_throttles.expires_at<NOW() THEN 1 ELSE login_throttles.failures+1 END,
        blocked_until=CASE WHEN login_throttles.expires_at>=NOW() AND login_throttles.failures>=4 THEN NOW()+INTERVAL '1 minute' ELSE NULL END,
        expires_at=CASE WHEN login_throttles.expires_at<NOW() THEN NOW()+INTERVAL '15 minutes' ELSE login_throttles.expires_at END`
      await this.prisma.loginLog.create({ data: { userId: user?.id, email, ipHash: hashToken(ip), result: 'failed' } })
      throw new UnauthorizedException(passwordValid && user?.status !== 'active' ? '账号已禁用，请联系管理员' : '账号或密码错误')
    }
    await this.prisma.loginThrottle.deleteMany({ where: { identityKey } })
    return this.prisma.$transaction(async (tx) => {
      await lockUser(tx, user.id)
      const locked = await tx.user.findUniqueOrThrow({ where: { id: user.id } })
      if (locked.status !== 'active' || locked.passwordHash !== user.passwordHash) throw new UnauthorizedException('账号凭证已变化，请重新登录')
      const fresh = await tx.user.update({ where: { id: user.id, status: 'active' }, data: { lastLoginAt: new Date() }, include: authUserInclude })
      await tx.loginLog.create({ data: { userId: user.id, email, ipHash: hashToken(ip), result: 'success' } })
      await actionEvent(tx, user.id, 'user_logged_in', 'user', user.id)
      const profile = authUserDto(fresh)
      return { user: profile, ...(await this.createSession(profile, tx)) }
    })
  }

  async createSession(user: AuthUser, tx: Prisma.TransactionClient = this.prisma): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
    if (tx === this.prisma) return this.prisma.$transaction((inner) => this.createSession(user, inner))
    await lockUser(tx, user.id)
    const current = await tx.user.findUniqueOrThrow({ where: { id: user.id }, include: authUserInclude })
    if (current.status !== 'active' || current.sessionVersion !== (user.sessionVersion || 0)) throw new UnauthorizedException('账号会话已变化，请重新登录')
    user = authUserDto(current)
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
      await lockUser(tx, stored.userId)
      const current = await tx.refreshToken.findUnique({ where: { id: stored.id }, include: { user: { include: authUserInclude } } })
      if (!current || current.revokedAt || current.expiresAt <= new Date() || current.user.status !== 'active') throw new UnauthorizedException('刷新凭据已失效')
      const claimed = await tx.refreshToken.updateMany({ where: { id: stored.id, revokedAt: null }, data: { revokedAt: new Date() } })
      if (!claimed.count) throw new UnauthorizedException('刷新凭据已失效')
      return this.createSession(authUserDto(current.user), tx)
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
