import 'reflect-metadata'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createRequire } from 'node:module'
import { createServer, type Server } from 'node:net'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { mkdtemp, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { NestFactory, Reflector } from '@nestjs/core'
import { ConfigService } from '@nestjs/config'
import type { INestApplication } from '@nestjs/common'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import cookieParser from 'cookie-parser'
import { generate } from 'otplib'
import { JwtService } from '@nestjs/jwt'

// 本文件只能在 NAS 的专属隔离容器中运行，不能指向现行业务库。
const database = new URL(process.env.DATABASE_URL || 'file:///missing')
if (process.env.CAMPUS_SECURITY_ISOLATED !== 'true' || database.hostname !== '127.0.0.1' || database.port !== '55439' || database.pathname !== '/campus_security_acceptance') throw new Error('仅允许 NAS 专属 campus_security_acceptance 隔离数据库')
const runtime = createRequire(process.cwd() + '/test/campus-security.e2e.spec.ts')
const { AppModule } = runtime('../dist/app.module.js')
const { browserBoundary } = runtime('../dist/common/deployment-security.js')
const { appValidationPipe } = runtime('../dist/common/validation.pipe.js')
const { ApiExceptionFilter } = runtime('../dist/common/api-exception.filter.js')
const { ApiResponseInterceptor } = runtime('../dist/common/api-response.interceptor.js')
const { OperationLogInterceptor } = runtime('../dist/common/operation-log.interceptor.js')
const { bootstrapDatabase } = runtime('../dist/modules/persistence/bootstrap.js')
const { encryptIdentity, identityFingerprint } = runtime('../dist/modules/users/identity-data.js')
const { ContentReferenceService } = runtime('../dist/common/content-reference/content-reference.service.js')
const { STORAGE_SERVICE } = runtime('../dist/modules/storage/storage.types.js')
const db = new PrismaClient(), password = 'Verify8!' + randomBytes(12).toString('hex')
const prefix = 'cs_' + randomBytes(5).toString('hex'), messages: string[] = []
const origin = 'http://127.0.0.1:8088', adminOrigin = 'http://127.0.0.1:8089'
const sha = (value: string) => createHash('sha256').update(value).digest('hex')
let app: INestApplication, smtp: Server, base: string, storage: string
let studentId: string, otherId: string, adminId: string, adminToken: string, recoveryCodes: string[], mfaSecret: string
async function request(path: string, options: { token?: string; method?: string; input?: unknown; cookie?: string; origin?: string; noOrigin?: boolean } = {}) {
  const headers: Record<string, string> = { 'content-type': 'application/json' }
  if (!options.noOrigin) headers.origin = options.origin || (path.startsWith('/admin-auth/') ? adminOrigin : origin)
  if (options.token) headers.authorization = 'Bearer ' + options.token
  if (options.cookie) headers.cookie = options.cookie
  const response = await fetch(base + path, { method: options.method || 'GET', headers, ...(options.input === undefined ? {} : { body: JSON.stringify(options.input) }) })
  const payload = await response.json()
  return { status: response.status, data: payload.data, message: payload.message as string, cookies: response.headers.getSetCookie() }
}
function cookie(result: Awaited<ReturnType<typeof request>>, client = 'student') {
  return result.cookies.find(value => value.startsWith(client + '_refresh='))?.split(';')[0] || ''
}
function sessionId(token: string) { return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString()).sessionId as string }
async function login(id = studentId, suppliedPassword = password) {
  const user = await db.user.findUniqueOrThrow({ where: { id } })
  const result = await request('/auth/login', { method: 'POST', input: { identifier: user.username, password: suppliedPassword } })
  expect(result.status).toBe(201)
  return result
}
async function adminChallenge() {
  const user = await db.user.findUniqueOrThrow({ where: { id: adminId } })
  const result = await request('/admin-auth/login', { method: 'POST', input: { identifier: user.username, password } })
  expect(result.status).toBe(201); expect(result.data.mfaRequired).toBe(true)
  expect(result.data.accessToken).toBeUndefined(); expect(result.cookies).toHaveLength(0)
  return result.data
}
beforeAll(async () => {
  storage = await mkdtemp(join(tmpdir(), 'campus-security-'))
  smtp = createServer(socket => {
    socket.write('220 localhost acceptance SMTP\r\n')
    let buffer = '', inData = false, content = ''
    socket.on('data', bytes => {
      buffer += bytes.toString()
      while (buffer.includes('\n')) {
        const end = buffer.indexOf('\n'), line = buffer.slice(0, end + 1); buffer = buffer.slice(end + 1)
        if (inData) {
          if (line.trim() === '.') { messages.push(content); content = ''; inData = false; socket.write('250 queued\r\n') }
          else content += line
        } else if (/^(EHLO|HELO)/.test(line)) socket.write('250-localhost\r\n250 OK\r\n')
        else if (/^DATA/.test(line)) { inData = true; socket.write('354 end with dot\r\n') }
        else if (/^QUIT/.test(line)) socket.end('221 bye\r\n')
        else socket.write('250 OK\r\n')
      }
    })
  })
  await new Promise<void>(resolve => smtp.listen(0, '127.0.0.1', resolve))
  Object.assign(process.env, {
    DEPLOYMENT_PROFILE: 'experience', LOAD_DEMO_DATA: 'false', VITE_DATA_MODE: 'api', COOKIE_SECURE: 'false',
    FRONTEND_URL: origin, ADMIN_WEB_URL: adminOrigin, CORS_ORIGINS: origin + ',' + adminOrigin,
    ADMIN_NETWORK_CIDRS: '127.0.0.1/32,::1/128', TRUSTED_PROXY_CIDRS: '',
    JWT_SECRET: randomBytes(48).toString('base64url'), MFA_DATA_KEY: randomBytes(32).toString('hex'),
    IDENTITY_DATA_KEY: randomBytes(32).toString('hex'), VIDEO_PLAYBACK_SECRET: randomBytes(48).toString('base64url'),
    STORAGE_DRIVER: 'local', STORAGE_LOCAL_PATH: storage, SEED_ADMIN_EMAIL: prefix + '@example.invalid', SEED_ADMIN_PASSWORD: password,
    SMTP_HOST: '127.0.0.1', SMTP_PORT: String((smtp.address() as { port: number }).port),
    SMTP_FROM: 'acceptance@example.invalid', SMTP_ALLOW_INSECURE: 'true',
  })
  await bootstrapDatabase(db)
  const studentRole = await db.role.findUniqueOrThrow({ where: { code: 'student' } })
  const adminRole = await db.role.findUniqueOrThrow({ where: { code: 'super_admin' } })
  const school = await db.school.create({ data: { name: prefix, code: prefix } })
  const createUser = async (suffix: string, roleId: string) => db.user.create({ data: {
    username: prefix + suffix, displayName: '隔离验收账号', email: prefix + suffix + '@example.invalid',
    passwordHash: await hash(password, 4), emailVerifiedAt: new Date(), onboardingCompletedAt: new Date(),
    schoolId: school.id, userRoles: { create: { roleId } }, communityProfile: { create: {} },
  } })
  studentId = (await createUser('a', studentRole.id)).id
  otherId = (await createUser('b', studentRole.id)).id
  adminId = (await createUser('admin', adminRole.id)).id
  const key = Buffer.from(process.env.IDENTITY_DATA_KEY!, 'hex'), syntheticId = '11010519491231002X'
  await db.campusIdentityVerification.create({ data: {
    userId: studentId, status: 'approved', realNameEncrypted: encryptIdentity('测试同学', key, 'real-name'),
    idNumberEncrypted: encryptIdentity(syntheticId, key, 'id-number'), idNumberFingerprint: identityFingerprint(syntheticId, key),
    idNumberLast4: '002X', className: '验收班', studentNo: prefix, submittedAt: new Date(), reviewedAt: new Date(),
  } })
  app = await NestFactory.create(AppModule, { logger: false, abortOnError: false })
  app.use(cookieParser()); app.use(browserBoundary(app.get(ConfigService)))
  app.setGlobalPrefix('api/v1'); app.useGlobalPipes(appValidationPipe)
  app.useGlobalFilters(new ApiExceptionFilter())
  app.useGlobalInterceptors(app.get(OperationLogInterceptor), new ApiResponseInterceptor(app.get(Reflector)))
  await app.listen(0, '127.0.0.1'); base = await app.getUrl() + '/api/v1'
}, 60000)
afterAll(async () => {
  await app?.close(); await db.$disconnect()
  if (smtp) await new Promise<void>(resolve => smtp.close(() => resolve()))
  if (storage) await rm(storage, { recursive: true, force: true })
})
describe('校园部署：真实数据库与认证执行链', () => {
  it('管理员首登必须完成成熟 TOTP；密钥加密且恢复码只保存哈希', async () => {
    const challenge = await adminChallenge(); mfaSecret = challenge.secret
    const before = await db.user.findUniqueOrThrow({ where: { id: adminId } })
    expect(before.mfaSecretEncrypted).not.toContain(mfaSecret)
    const result = await request('/admin-auth/mfa', { method: 'POST', input: { challenge: challenge.challenge, code: await generate({ secret: mfaSecret }) } })
    expect(result.status).toBe(201)
    adminToken = result.data.accessToken; recoveryCodes = result.data.recoveryCodes
    expect(recoveryCodes).toHaveLength(10)
    expect(cookie(result, 'admin')).toBeTruthy()
    expect(result.cookies[0]).toContain('Path=/api/v1/admin-auth')
    const after = await db.user.findUniqueOrThrow({ where: { id: adminId } })
    expect(after.mfaRecoveryHashes).toEqual(recoveryCodes.map(sha))
    expect((await request('/me', { token: adminToken })).data.mfaVerified).toBe(true)
    expect((await request('/admin-auth/mfa', { method: 'POST', input: { challenge: challenge.challenge, code: recoveryCodes[0] } })).status).toBe(401)
    expect((await request('/auth/login', { method: 'POST', input: { identifier: before.username, password } })).status).toBe(403)
  })
  it('TOTP 不可重放，恢复码只能成功使用一次', async () => {
    const challenge = await adminChallenge()
    const replay = await request('/admin-auth/mfa', { method: 'POST', input: { challenge: challenge.challenge, code: await generate({ secret: mfaSecret }) } })
    // 如果恰好跨越30秒窗口，该码本应有效；使用持久 lastTimeStep 精确重放。
    if (replay.status === 201) {
      const next = await adminChallenge()
      const row = await db.user.findUniqueOrThrow({ where: { id: adminId } })
      expect((await request('/admin-auth/mfa', { method: 'POST', input: { challenge: next.challenge, code: await generate({ secret: mfaSecret, epoch: row.mfaLastTimeStep! * 30 }) } })).status).toBe(401)
    } else expect(replay.status).toBe(401)
    const next = await adminChallenge()
    expect((await request('/admin-auth/mfa', { method: 'POST', input: { challenge: next.challenge, code: recoveryCodes[0] } })).status).toBe(201)
    const again = await adminChallenge()
    expect((await request('/admin-auth/mfa', { method: 'POST', input: { challenge: again.challenge, code: recoveryCodes[0] } })).status).toBe(401)
  })
  it('学生和管理员 Cookie 分名分路径；错入口、无 Origin 和学生越权均拒绝', async () => {
    const student = await login()
    expect(student.data.mfaRequired).toBeUndefined()
    expect(student.cookies[0]).toContain('student_refresh=')
    expect(student.cookies[0]).toContain('Path=/api/v1/auth')
    expect(student.cookies[0]).toContain('HttpOnly')
    expect((await request('/admin-auth/refresh', { method: 'POST', cookie: cookie(student) })).status).toBe(401)
    expect((await request('/auth/refresh', { method: 'POST', cookie: cookie(student), origin: adminOrigin })).status).toBe(403)
    expect((await request('/auth/logout', { method: 'POST', cookie: cookie(student), noOrigin: true })).status).toBe(403)
    expect((await request('/admin/users', { token: student.data.accessToken })).status).toBe(403)
    expect((await request('/community/feed')).status).toBe(401)
  })
  it('刷新轮换并发仅一次成功，旧 Cookie 失效，设备条目保持同一个 ID', async () => {
    const student = await login(), id = sessionId(student.data.accessToken), old = cookie(student)
    const results = await Promise.all([1, 2].map(() => request('/auth/refresh', { method: 'POST', cookie: old })))
    expect(results.map(result => result.status).sort()).toEqual([201, 401])
    const fresh = results.find(result => result.status === 201)!
    expect(sessionId(fresh.data.accessToken)).toBe(id)
    expect(cookie(fresh)).not.toBe(old)
    expect((await request('/auth/refresh', { method: 'POST', cookie: old })).status).toBe(401)
  })
  it('注销只撤销当前设备，旧 Access Token 立即失效，另一个账号及设备保留', async () => {
    const first = await login(), second = await login(), other = await login(otherId)
    expect((await request('/auth/logout', { method: 'POST', token: first.data.accessToken, cookie: cookie(other) })).status).toBe(201)
    expect((await request('/me', { token: first.data.accessToken })).status).toBe(401)
    expect((await request('/me', { token: second.data.accessToken })).status).toBe(200)
    expect((await request('/me', { token: other.data.accessToken })).status).toBe(200)
    expect((await request('/me/sessions/' + sessionId(other.data.accessToken), { method: 'DELETE', token: second.data.accessToken })).status).toBe(400)
    expect((await request('/me/sessions/' + sessionId(second.data.accessToken), { method: 'DELETE', token: second.data.accessToken })).status).toBe(200)
    expect((await request('/me', { token: second.data.accessToken })).status).toBe(401)
  })
  it('多标签切换账号后旧标签不串用 Cookie，过期 Bearer 退出不清除新账号 Cookie', async () => {
    const previous = await login(), other = await login(otherId)
    const claims = { id: studentId, sessionId: sessionId(previous.data.accessToken), sessionClient: 'student', sessionVersion: 0 }
    const expired = await app.get(JwtService).signAsync(claims, { secret: app.get(ConfigService).get('JWT_SECRET'), expiresIn: -1 })
    expect((await request('/auth/refresh', { method: 'POST', token: expired, cookie: cookie(other) })).status).toBe(401)
    // 相同设备的过期 Access 仍可配合有效 Cookie 完成正常刷新。
    const renewed = await request('/auth/refresh', { method: 'POST', token: expired, cookie: cookie(previous) })
    expect(renewed.status).toBe(201)
    const result = await request('/auth/logout', { method: 'POST', token: expired, cookie: cookie(other) })
    expect(result.status).toBe(201); expect(result.cookies).toHaveLength(0)
    expect((await request('/me', { token: renewed.data.accessToken })).status).toBe(401)
    expect((await request('/auth/refresh', { method: 'POST', token: other.data.accessToken, cookie: cookie(other) })).status).toBe(201)
  })
  it('仅作者可授权门户，保存和编辑实际控制匿名投影，public 枚举语义保持', async () => {
    const student = await login()
    const input = { type: 'general', title: '隔离门户授权', contentBlocks: [{ type: 'paragraph', text: '仅用于检查校园内容的自主授权 ' + randomUUID() }], bindings: [], topicIds: [], visibility: 'public', status: 'published' }
    const saved = await request('/community/posts', { method: 'POST', token: student.data.accessToken, input })
    expect(saved.status).toBe(201); expect(saved.data.portalConsent).toBe(false)
    const refs = app.get( ContentReferenceService )
    expect(await refs.resolvePublicCommunity('community_post', saved.data.id)).toBeNull()
    const granted = await request('/community/posts/' + saved.data.id, { method: 'PATCH', token: student.data.accessToken, input: { ...input, expectedRevision: saved.data.revision, portalConsent: true } })
    expect(granted.status).toBe(200)
    expect(await refs.resolvePublicCommunity('community_post', saved.data.id)).not.toBeNull()
    const revoked = await request('/community/posts/' + saved.data.id, { method: 'PATCH', token: student.data.accessToken, input: { ...input, expectedRevision: granted.data.revision, portalConsent: false } })
    expect(revoked.status).toBe(200)
    expect(await refs.resolvePublicCommunity('community_post', saved.data.id)).toBeNull()
    expect((await db.communityPost.findUniqueOrThrow({ where: { id: saved.data.id } })).visibility).toBe('public')
  })
  it('真实附件接口绑定设备，注销、撤销和后台网络边界同时约束旧媒体地址', async () => {
    const first = await login(), second = await login()
    const content = Buffer.from('隔离设备媒体授权验收')
    const file = await app.get(STORAGE_SERVICE).upload({ originalname: 'session-check.txt', mimetype: 'text/plain', size: content.length, buffer: content }, { uploadedBy: studentId, visibility: 'private' })
    const saved = await request('/community/posts', { method: 'POST', token: first.data.accessToken, input: {
      type: 'general', title: '隔离设备资料', contentBlocks: [{ type: 'paragraph', text: '检查设备与资源权限 ' + randomUUID() }],
      bindings: [], topicIds: [], visibility: 'public', status: 'published',
      contribution: { kind: 'document', tags: [], teachingReuseConsent: false, attachmentFileId: file.id },
    } })
    expect(saved.status).toBe(201)
    const download = async (token: string) => {
      const result = await request('/resource-hub/contributions/' + saved.data.id, { token })
      expect(result.status).toBe(200)
      return new URL(result.data.contribution.attachment.downloadUrl, base).toString()
    }
    const read = async (url: string) => {
      const response = await fetch(url)
      await response.arrayBuffer()
      return response
    }
    const firstUrl = await download(first.data.accessToken), secondUrl = await download(second.data.accessToken)
    const initial = await read(firstUrl)
    expect(initial.status).toBe(200)
    expect(initial.headers.get('content-disposition')).toMatch(/^attachment;/)
    expect(initial.headers.get('content-security-policy')).toContain('sandbox')
    expect((await request('/auth/logout', { method: 'POST', token: first.data.accessToken })).status).toBe(201)
    expect((await read(firstUrl)).status).toBe(403)
    expect((await read(secondUrl)).status).toBe(200)
    expect((await request('/me/sessions/' + sessionId(second.data.accessToken), { method: 'DELETE', token: second.data.accessToken })).status).toBe(200)
    expect((await read(secondUrl)).status).toBe(403)
    const adminUrl = await download(adminToken), configuration = app.get(ConfigService)
    expect((await read(adminUrl)).status).toBe(200)
    const allowed = configuration.get('ADMIN_NETWORK_CIDRS')
    configuration.set('ADMIN_NETWORK_CIDRS', '192.0.2.9/32')
    try {
      expect((await read(adminUrl)).status).toBe(403)
      expect((await request('/admin/users', { token: adminToken })).status).toBe(403)
    } finally { configuration.set('ADMIN_NETWORK_CIDRS', allowed) }
  })
  it('换邮箱必须重新认证并确认新地址，确认前保持原邮箱，之后撤销校园认证和所有会话', async () => {
    const student = await login(), other = await login()
    const original = await db.user.findUniqueOrThrow({ where: { id: studentId } }), email = prefix + 'new@example.invalid'
    expect((await request('/me/email', { method: 'POST', token: student.data.accessToken, input: { email, currentPassword: 'wrong-password' } })).status).toBe(401)
    expect((await request('/me/email', { method: 'POST', token: student.data.accessToken, input: { email, currentPassword: password } })).status).toBe(201)
    expect((await db.user.findUniqueOrThrow({ where: { id: studentId } })).email).toBe(original.email)
    const message = messages.at(-1)!.replace(/=\r?\n/g, '').replace(/=([0-9A-F]{2})/g, (_, value) => String.fromCharCode(parseInt(value, 16)))
    const token = message.match(/#token=([A-Za-z0-9_-]{40,128})/)?.[1]
    expect(!!token).toBe(true)
    const confirmed = await request('/auth/email/verify', { method: 'POST', input: { token } })
    expect(confirmed.status).toBe(201); expect(confirmed.data.emailChanged).toBe(true)
    expect((await db.user.findUniqueOrThrow({ where: { id: studentId } })).email).toBe(email)
    expect((await db.campusIdentityVerification.findUniqueOrThrow({ where: { userId: studentId } })).status).toBe('revoked')
    for (const session of [student, other]) expect((await request('/me', { token: session.data.accessToken })).status).toBe(401)
    expect((await request('/auth/email/verify', { method: 'POST', input: { token } })).status).toBe(400)
  })
  it('改密保护72字节边界，旧 bcrypt 可登录，弱口令拒绝，成功后所有 Access/Refresh 失效', async () => {
    const first = await login(), second = await login(), nextPassword = 'NewCampus7!' + randomBytes(10).toString('hex')
    for (const next of ['Password123456', '学'.repeat(24) + 'A1']) expect((await request('/me/password', { method: 'POST', token: first.data.accessToken, input: { currentPassword: password, password: next } })).status).toBe(400)
    expect((await request('/me/password', { method: 'POST', token: first.data.accessToken, input: { currentPassword: 'wrong-password', password: nextPassword } })).status).toBe(401)
    expect((await request('/me/password', { method: 'POST', token: first.data.accessToken, input: { currentPassword: password, password: nextPassword } })).status).toBe(201)
    for (const old of [first, second]) {
      expect((await request('/me', { token: old.data.accessToken })).status).toBe(401)
      expect((await request('/auth/refresh', { method: 'POST', cookie: cookie(old) })).status).toBe(401)
    }
    const fresh = await login(studentId, nextPassword)
    expect((await request('/me/sessions/all', { method: 'DELETE', token: fresh.data.accessToken })).status).toBe(200)
    expect((await request('/me', { token: fresh.data.accessToken })).status).toBe(401)
  })
})
