// 仅由 drill.py 通过 stdin 在独立 API 容器中执行；不输出账号、令牌或媒体签名。
import assert from 'node:assert/strict'
import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
const prisma = new PrismaClient()
const base = 'http://127.0.0.1:3000/api/v1'
const checks = []
async function json(path, token, init = {}) {
  const response = await fetch(base + path, { ...init, headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers }, signal: AbortSignal.timeout(10000) })
  const body = await response.json()
  assert.equal(response.status, 200 + (init.method === 'POST' ? 1 : 0), '恢复接口 HTTP 状态异常')
  assert.equal(body.code, 0, '恢复接口业务状态异常')
  return body.data
}
try {
  let ready = false
  for (let i = 0; i < 60; i++) {
    try { const response = await fetch(base + '/health', { signal: AbortSignal.timeout(2000) }); if (response.ok) { ready = true; break } } catch { /* 等待应用就绪 */ }
    await new Promise(resolve => setTimeout(resolve, 1000))
  }
  assert(ready, '恢复应用未就绪')
  checks.push('readiness')
  for (const origin of input.frontends) {
    const page = await fetch(origin, { signal: AbortSignal.timeout(5000) })
    assert.equal(page.status, 200)
    const html = await page.text()
    assert.match(html, /<html/i)
    const assets = [...html.matchAll(/(?:src|href)="([^"]+\.(?:js|css))"/g)].map(match => match[1])
    assert(assets.length, '恢复前端缺少脚本或样式')
    for (const asset of assets) {
      const url = new URL(asset, origin)
      assert.equal(url.origin, origin)
      const resource = await fetch(url, { signal: AbortSignal.timeout(5000) })
      assert.equal(resource.status, 200)
      assert.match(resource.headers.get('content-type') || '', /javascript|css/)
      await resource.arrayBuffer()
    }
    const api = await fetch(origin + '/api/v1/health', { signal: AbortSignal.timeout(5000) })
    assert.equal(api.status, 200)
  }
  checks.push('student-admin-static-and-proxy')
  const login = async role => json('/auth/login', '', { method: 'POST', body: JSON.stringify({ identifier: input.credentials[`${role}Identifier`], password: input.credentials[`${role}Password`], remember: false }) })
  const student = await login('student'), admin = await login('admin')
  assert(student.user.id && admin.user.id)
  checks.push('existing-student-and-admin-login')
  const anonymous = await fetch(base + '/admin/persistence', { signal: AbortSignal.timeout(5000) })
  assert.equal(anonymous.status, 401)
  const forbidden = await fetch(base + '/admin/persistence', { headers: { authorization: `Bearer ${student.accessToken}` }, signal: AbortSignal.timeout(5000) })
  assert.equal(forbidden.status, 403)
  await json('/admin/persistence', admin.accessToken)
  if (!input.previous) {
    const detail = await json('/admin/persistence/operations', admin.accessToken)
    assert(detail.checks.database.status === 'ok')
    const response = await fetch(base + '/admin/persistence/operations', { headers: { authorization: `Bearer ${student.accessToken}` } })
    assert.equal(response.status, 403)
  }
  checks.push('admin-boundary')
  const posts = await json('/community/posts?limit=20', student.accessToken)
  assert(Array.isArray(posts.items) && posts.items.length, '恢复库没有可验证的可见帖子')
  await json(`/community/posts/${encodeURIComponent(posts.items[0].id)}`, student.accessToken)
  checks.push('post-read')
  let commentFound = false
  for (const post of posts.items) {
    const comments = await json(`/community/posts/${encodeURIComponent(post.id)}/comments`, student.accessToken)
    const rows = Array.isArray(comments) ? comments : comments.items
    if (rows?.length) { commentFound = true; break }
  }
  assert(commentFound, '恢复库抽样未覆盖评论，不得把空列表当作验证通过')
  checks.push('comment-read')
  const courses = await prisma.course.findMany({ where: { status: 'published', deletedAt: null, publishedVersionId: { not: null } }, include: { publishedVersion: true }, take: 10 })
  assert(courses.length, '恢复库没有可验证的发布课程')
  for (const course of courses) {
    assert.equal(course.publishedVersion.courseId, course.id)
    await json(`/courses/${encodeURIComponent(course.slug)}`, student.accessToken)
  }
  checks.push('course-version-relations')
  const files = await prisma.fileRecord.findMany({ where: { visibility: 'public', quarantinedAt: null, objectKey: { startsWith: 'catalog/' } }, take: 1 })
  assert(files.length, '恢复库没有可验证的公共文件')
  const file = files[0]
  const download = await fetch(`${base}/files/${encodeURIComponent(file.id)}/download`, { headers: { authorization: `Bearer ${admin.accessToken}` }, signal: AbortSignal.timeout(10000) })
  assert.equal(download.status, 200)
  const bytes = Buffer.from(await download.arrayBuffer())
  assert.equal(bytes.length, file.size)
  assert.equal(createHash('sha256').update(bytes).digest('hex'), file.checksum)
  checks.push('file-authorized-download-and-hash')
  const hub = await json('/resource-hub/items?limit=50', student.accessToken)
  const video = hub.items.find(item => item.videoAssetId && item.mediaStatus === 'ready')
  assert(video, '恢复库没有可验证的视频，必须补充演练样本，不能声称播放通过')
  const playback = await json(`/resource-hub/videos/${encodeURIComponent(video.videoAssetId)}/playback`, student.accessToken)
  const playbackUrl = new URL(playback.sources[0].src, base)
  assert.equal(playbackUrl.origin, 'http://127.0.0.1:3000')
  const partial = await fetch(playbackUrl, { headers: { range: 'bytes=0-1023' }, signal: AbortSignal.timeout(10000) })
  assert.equal(partial.status, 206)
  assert.match(partial.headers.get('content-range') || '', /^bytes 0-1023\//)
  assert.equal((await partial.arrayBuffer()).byteLength, 1024)
  // 真正解码一秒媒体，不能只凭 Range 206 判定可播放。URL 不进入任何日志。
  execFileSync('ffmpeg', ['-v', 'error', '-i', playbackUrl.href, '-t', '1', '-f', 'null', '-'], { timeout: 20000, stdio: ['ignore', 'pipe', 'pipe'] })
  checks.push('video-range-and-decode')
  console.log(JSON.stringify({ passed: true, checks }))
} catch {
  console.log(JSON.stringify({ passed: false, checks, reason: '恢复验证未覆盖全部要求或断言失败' }))
  process.exitCode = 1
} finally { await prisma.$disconnect() }
