import { beforeAll, describe, expect, it } from 'vitest'

const base = process.env.E2E_BASE_URL
const adminEmail = process.env.E2E_ADMIN_EMAIL
const adminPassword = process.env.E2E_ADMIN_PASSWORD
const studentEmail = process.env.E2E_STUDENT_EMAIL
const studentPassword = process.env.E2E_STUDENT_PASSWORD

if (!base || !adminEmail || !adminPassword || !studentEmail || !studentPassword) {
  throw new Error('E2E_BASE_URL 与 E2E_* 凭据必须通过环境变量提供')
}

interface Envelope<T> { code: number; message: string; data: T }
const call = async <T>(path: string, init: RequestInit = {}, token?: string) => {
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}), ...init.headers },
  })
  const body = await response.json() as Envelope<T>
  if (!response.ok || body.code !== 0) throw new Error(`${path}: ${body.message}`)
  return body.data
}
const login = (email: string, password: string) => call<{ accessToken: string; user: { id: string } }>('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

describe('真实 PostgreSQL 数据闭环', () => {
  let adminToken = ''
  let studentToken = ''
  let studentId = ''
  let courseId = ''
  let themeId = ''
  let labId = ''
  let resourceId = ''
  let articleId = ''
  let fileId = ''
  let originalHeroTitle = ''
  let heroModuleId = ''
  let homepageItemId = ''
  let notificationId = ''
  const suffix = Date.now()
  const slug = `e2e-course-${suffix}`

  beforeAll(async () => {
    const admin = await login(adminEmail, adminPassword)
    const student = await login(studentEmail, studentPassword)
    adminToken = admin.accessToken
    studentToken = student.accessToken
    studentId = student.user.id
  })

  it('未认证和学生角色不能访问管理接口', async () => {
    expect((await fetch(`${base}/admin/courses`)).status).toBe(401)
    expect((await fetch(`${base}/admin/courses`, { headers: { authorization: `Bearer ${studentToken}` } })).status).toBe(403)
    const unsafeUpload = new FormData()
    unsafeUpload.append('file', new Blob(['echo unsafe'], { type: 'application/x-sh' }), 'unsafe.sh')
    expect((await fetch(`${base}/admin/files/upload`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
      body: unsafeUpload,
    })).status).toBe(400)
    const wechat = await fetch(`${base}/auth/wechat/miniapp`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code: 'unconfigured-test-code' }),
    })
    expect(wechat.status).toBe(503)
    const quizBoxHealth = await fetch(`${base}/admin/integrations/quiz-box/health`, {
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(quizBoxHealth.status).toBe(503)
    const quizBoxImport = await fetch(`${base}/admin/integrations/quiz-box/attempts/unconfigured-attempt/import`, {
      method: 'POST',
      headers: { authorization: `Bearer ${adminToken}` },
    })
    expect(quizBoxImport.status).toBe(503)
  })

  it('学校院系和登录审计来自真实数据库', async () => {
    const schools = await call<Array<{ departments: unknown[] }>>('/admin/schools', {}, adminToken)
    expect(schools[0].departments.length).toBeGreaterThan(0)
    const users = await call<Array<{ id: string; school: { id: string } | null }>>('/admin/users', {}, adminToken)
    expect(users.some((item) => item.id === studentId && item.school)).toBe(true)
    const loginLogs = await call<Array<{ result: string }>>('/admin/login-logs', {}, adminToken)
    expect(loginLogs.some((item) => item.result === 'success')).toBe(true)
  })

  it('管理端创建发布后学生公开接口读取同一记录', async () => {
    const created = await call<{ databaseId: string; id: string }>('/admin/courses', {
      method: 'POST',
      body: JSON.stringify({ slug, title: '端到端数据闭环课程', summary: '由管理端创建并由学生端读取。', payload: { category: '大模型 LLM', level: '入门', hours: 1, learners: 0, mode: '图文' } }),
    }, adminToken)
    courseId = created.databaseId
    const chapter = await call<{ id: string }>(`/admin/courses/${courseId}/chapters`, {
      method: 'POST',
      body: JSON.stringify({ title: '端到端章节', description: '真实 PostgreSQL 章节', sortOrder: 1 }),
    }, adminToken)
    const lesson = await call<{ id: string }>(`/admin/chapters/${chapter.id}/lessons`, {
      method: 'POST',
      body: JSON.stringify({ title: '端到端课时', summary: '真实结构化课时', durationMinutes: 15, sortOrder: 1 }),
    }, adminToken)
    const block = await call<{ id: string }>(`/admin/lessons/${lesson.id}/blocks`, {
      method: 'POST',
      body: JSON.stringify({ blockType: 'paragraph', content: { text: '由后台写入的结构化内容块。' }, sortOrder: 1 }),
    }, adminToken)
    await call(`/admin/courses/${courseId}/chapters/reorder`, { method: 'PUT', body: JSON.stringify({ items: [{ id: chapter.id, sortOrder: 1 }] }) }, adminToken)
    await call(`/admin/lessons/${lesson.id}/blocks/reorder`, { method: 'PUT', body: JSON.stringify({ items: [{ id: block.id, sortOrder: 1 }] }) }, adminToken)
    await call(`/admin/courses/${courseId}/publish`, { method: 'POST' }, adminToken)
    const publicCourse = await call<{ slug: string; title: string; chapters: Array<{ lessons: Array<{ blocks: Array<{ content: { text: string } }> }> }> }>(`/courses/${slug}`)
    expect(publicCourse).toMatchObject({ slug, title: '端到端数据闭环课程' })
    expect(publicCourse.chapters[0].lessons[0].blocks[0].content.text).toBe('由后台写入的结构化内容块。')
    await call(`/admin/courses/${courseId}`, {
      method: 'PATCH',
      body: JSON.stringify({ title: '尚未发布的新标题' }),
    }, adminToken)
    expect((await call<{ title: string }>(`/courses/${slug}`)).title).toBe('端到端数据闭环课程')
    await call(`/admin/courses/${courseId}/publish`, { method: 'POST' }, adminToken)
    expect((await call<{ title: string }>(`/courses/${slug}`)).title).toBe('尚未发布的新标题')
    await call(`/courses/${slug}/progress`, { method: 'PUT', body: JSON.stringify({ progress: 50 }) }, studentToken)
    const myCourses = await call<Array<{ course: { slug: string } }>>('/me/courses', {}, studentToken)
    expect(myCourses.some((item) => item.course.slug === slug)).toBe(true)
  })

  it('主题路径与首页发布由学生公开接口读取', async () => {
    const theme = await call<{ databaseId: string }>('/admin/themes', {
      method: 'POST',
      body: JSON.stringify({ slug: `e2e-theme-${suffix}`, title: '端到端主题', summary: '统一主题路径。', payload: {} }),
    }, adminToken)
    themeId = theme.databaseId
    await call(`/admin/themes/${themeId}/path`, {
      method: 'PUT',
      body: JSON.stringify({ name: '端到端路径', stages: [{ name: '入门', stageType: 'intro', targetType: 'course', targetId: courseId }] }),
    }, adminToken)
    await call(`/admin/themes/${themeId}/publish`, { method: 'POST' }, adminToken)
    const publicTheme = await call<{ paths: Array<{ stages: Array<{ name: string }> }> }>(`/themes/e2e-theme-${suffix}`)
    expect(publicTheme.paths[0].stages[0].name).toBe('入门')

    const modules = await call<Array<{ id: string; moduleKey: string; config: Record<string, unknown> }>>('/admin/homepage/modules', {}, adminToken)
    const hero = modules.find((item) => item.moduleKey === 'hero_banner')
    expect(hero).toBeTruthy()
    originalHeroTitle = String(hero?.config.title || '')
    heroModuleId = String(hero?.id || '')
    const homepageItem = await call<{ id: string }>(`/admin/homepage/modules/${heroModuleId}/items`, {
      method: 'POST',
      body: JSON.stringify({ targetType: 'course', targetId: courseId, sortOrder: 1 }),
    }, adminToken)
    homepageItemId = homepageItem.id
    await call(`/admin/homepage/modules/${hero?.id}`, {
      method: 'PATCH',
      body: JSON.stringify({ config: { ...hero?.config, title: '端到端首页发布标题' } }),
    }, adminToken)
    await call('/admin/homepage/publish', { method: 'POST' }, adminToken)
    const homepage = await call<{ modules: Array<{ moduleKey: string; config: Record<string, unknown>; items: unknown[] }> }>('/public/homepage')
    const publicHero = homepage.modules.find((item) => item.moduleKey === 'hero_banner')
    expect(publicHero?.config.title).toBe('端到端首页发布标题')
    expect(publicHero?.items.length).toBeGreaterThan(0)
    await call(`/admin/homepage/modules/${heroModuleId}`, { method: 'PATCH', body: JSON.stringify({ config: { ...hero?.config, title: '尚未发布的首页标题' } }) }, adminToken)
    const unchanged = await call<{ modules: Array<{ moduleKey: string; config: Record<string, unknown> }> }>('/public/homepage')
    expect(unchanged.modules.find((item) => item.moduleKey === 'hero_banner')?.config.title).toBe('端到端首页发布标题')
    await call('/admin/homepage/publish', { method: 'POST' }, adminToken)
    const republished = await call<{ modules: Array<{ moduleKey: string; config: Record<string, unknown> }> }>('/public/homepage')
    expect(republished.modules.find((item) => item.moduleKey === 'hero_banner')?.config.title).toBe('尚未发布的首页标题')
  })

  it('实训步骤由后台发布并形成服务端运行记录', async () => {
    const lab = await call<{ databaseId: string }>('/admin/labs', {
      method: 'POST',
      body: JSON.stringify({ slug: `e2e-lab-${suffix}`, title: '端到端实训', summary: '受控实训数据闭环。', payload: { labType: 'deployment', category: '模型部署' } }),
    }, adminToken)
    labId = lab.databaseId
    await call(`/admin/labs/${labId}/steps`, {
      method: 'POST',
      body: JSON.stringify({ stepKey: 'prepare', title: '准备环境', description: '只执行受控状态机。', sortOrder: 1, instruction: { type: 'guided' }, validator: { allowed: true }, score: 20 }),
    }, adminToken)
    await call(`/admin/labs/${labId}/publish`, { method: 'POST' }, adminToken)
    const detail = await call<{ stepsDetail: Array<{ stepKey: string }> }>(`/labs/e2e-lab-${suffix}`)
    expect(detail.stepsDetail[0].stepKey).toBe('prepare')
    await call(`/admin/labs/${labId}/steps`, {
      method: 'POST',
      body: JSON.stringify({ stepKey: 'draft-only', title: '草稿步骤', description: '发布前不可见。', sortOrder: 2, instruction: {}, validator: {}, score: 10 }),
    }, adminToken)
    expect((await call<{ stepsDetail: unknown[] }>(`/labs/e2e-lab-${suffix}`)).stepsDetail.length).toBe(1)
    await call(`/admin/labs/${labId}/publish`, { method: 'POST' }, adminToken)
    expect((await call<{ stepsDetail: unknown[] }>(`/labs/e2e-lab-${suffix}`)).stepsDetail.length).toBe(2)
    const run = await call<{ id: string }>(`/labs/e2e-lab-${suffix}/runs`, { method: 'POST' }, studentToken)
    await call(`/lab-runs/${run.id}/actions`, { method: 'POST', body: JSON.stringify({ action: 'start' }) }, studentToken)
    const stream = await fetch(`${base}/lab-runs/${run.id}/events`, {
      headers: { authorization: `Bearer ${studentToken}` },
      signal: AbortSignal.timeout(3000),
    })
    expect(stream.headers.get('content-type')).toContain('text/event-stream')
    const reader = stream.body?.getReader()
    let eventText = ''
    for (let index = 0; index < 5 && !eventText.includes('受控实训环境已准备'); index += 1) {
      const event = await reader?.read()
      eventText += new TextDecoder().decode(event?.value)
    }
    await reader?.cancel()
    expect(eventText).toContain('受控实训环境已准备')
    await call(`/lab-runs/${run.id}/actions`, { method: 'POST', body: JSON.stringify({ action: 'complete' }) }, studentToken)
    await call(`/lab-runs/${run.id}/submit`, { method: 'POST' }, studentToken)
    const runs = await call<Array<{ id: string }>>(`/admin/labs/${labId}/runs`, {}, adminToken)
    expect(runs.some((item) => item.id === run.id)).toBe(true)
  })

  it('文件上传、资源发布、下载和计数形成真实闭环', async () => {
    const form = new FormData()
    form.append('visibility', 'public')
    form.append('file', new Blob(['端到端资源内容'], { type: 'text/plain' }), 'e2e-resource.txt')
    const uploadResponse = await fetch(`${base}/admin/files/upload`, { method: 'POST', headers: { authorization: `Bearer ${adminToken}` }, body: form })
    const uploadBody = await uploadResponse.json() as Envelope<{ id: string }>
    expect(uploadResponse.status).toBe(201)
    fileId = uploadBody.data.id
    const resource = await call<{ databaseId: string }>('/admin/resources', {
      method: 'POST',
      body: JSON.stringify({
        slug: `e2e-resource-${suffix}`,
        title: '端到端资源',
        summary: '真实文件与资源元数据。',
        payload: { category: '学习手册', format: 'TXT', visibility: 'public', fileId },
      }),
    }, adminToken)
    resourceId = resource.databaseId
    await call(`/admin/resources/${resourceId}/publish`, { method: 'POST' }, adminToken)
    const detail = await call<{ fileId: string; views: number }>(`/resources/e2e-resource-${suffix}`)
    expect(detail.fileId).toBe(fileId)
    expect(detail.views).toBeGreaterThan(0)
    const download = await fetch(`${base}/files/${fileId}/download`, { headers: { authorization: `Bearer ${studentToken}` } })
    expect(download.status).toBe(200)
    expect(await download.text()).toBe('端到端资源内容')
  })

  it('资讯发布与阅读计数写回 PostgreSQL', async () => {
    const article = await call<{ databaseId: string }>('/admin/articles', {
      method: 'POST',
      body: JSON.stringify({ slug: `e2e-article-${suffix}`, title: '端到端资讯', summary: '真实资讯阅读统计。', payload: { category: 'AI 安全', content: ['正文'] } }),
    }, adminToken)
    articleId = article.databaseId
    await call(`/admin/articles/${articleId}/recommendations`, {
      method: 'PUT',
      body: JSON.stringify({ items: [{ positionKey: 'frontier_hero', sortOrder: 1, enabled: true }] }),
    }, adminToken)
    await call(`/admin/articles/${articleId}/schedule`, {
      method: 'POST',
      body: JSON.stringify({ scheduledAt: new Date(Date.now() - 1000).toISOString() }),
    }, adminToken)
    const first = await call<{ views: number }>(`/articles/e2e-article-${suffix}`)
    const second = await call<{ views: number; recommendations: unknown[] }>(`/articles/e2e-article-${suffix}`)
    expect(second.views).toBe(first.views + 1)
    expect(second.recommendations.length).toBe(1)
    await call(`/admin/articles/${articleId}`, { method: 'PATCH', body: JSON.stringify({ title: '资讯未发布新标题' }) }, adminToken)
    expect((await call<{ title: string }>(`/articles/e2e-article-${suffix}`)).title).toBe('端到端资讯')
    await call(`/admin/articles/${articleId}/publish`, { method: 'POST' }, adminToken)
    expect((await call<{ title: string }>(`/articles/e2e-article-${suffix}`)).title).toBe('资讯未发布新标题')
  })

  it('学生收藏回写后管理端读取同一用户成长数据', async () => {
    await call('/favorites', { method: 'POST', body: JSON.stringify({ targetType: 'course', targetId: slug }) }, studentToken)
    const growth = await call<{ favorites: Array<{ targetId: string }> }>(`/admin/users/${studentId}/growth`, {}, adminToken)
    expect(growth.favorites.some((item) => item.targetId === slug)).toBe(true)
  })

  it('实训运行与提交写入真实记录并累积成长积分', async () => {
    const run = await call<{ id: string }>('/labs/model-service/runs', { method: 'POST' }, studentToken)
    await call(`/lab-runs/${run.id}/actions`, { method: 'POST', body: JSON.stringify({ action: 'start' }) }, studentToken)
    await call(`/lab-runs/${run.id}/actions`, { method: 'POST', body: JSON.stringify({ action: 'complete' }) }, studentToken)
    const submitted = await call<{ status: string }>(`/lab-runs/${run.id}/submit`, { method: 'POST' }, studentToken)
    expect(submitted.status).toBe('submitted')
  })

  it('统一题库公开接口不含答案，服务端事务计算成绩', async () => {
    const challengePage = await call<{ items: Array<{ slug: string; databaseId: string }> }>('/admin/challenges?pageSize=100', {}, adminToken)
    const challenge = challengePage.items.find((item) => item.slug === 'weekly-ai')
    const banks = await call<Array<{ id: string }>>('/admin/question-banks', {}, adminToken)
    const bankQuestions = await call<Array<{ id: string }>>(`/admin/questions?bankId=${banks[0].id}`, {}, adminToken)
    const paper = await call<{ id: string }>('/admin/papers', {
      method: 'POST',
      body: JSON.stringify({ name: `端到端试卷 ${suffix}`, description: '试卷与题库只保存关联。', durationMinutes: 20, totalScore: 100, passScore: 60 }),
    }, adminToken)
    await call(`/admin/papers/${paper.id}/questions`, {
      method: 'PUT',
      body: JSON.stringify({ items: bankQuestions.map((item, index) => ({ questionId: item.id, sortOrder: index + 1, score: 100 / bankQuestions.length })) }),
    }, adminToken)
    await call(`/admin/challenges/${challenge?.databaseId}/paper`, { method: 'PUT', body: JSON.stringify({ paperId: paper.id }) }, adminToken)
    const questions = await call<Array<Record<string, unknown>>>('/challenges/weekly-ai/questions', {}, studentToken)
    expect(questions.length).toBeGreaterThan(0)
    expect(questions.every((question) => !('standardAnswer' in question))).toBe(true)
    const originalStem = String(questions[0].stem)
    await call(`/admin/questions/${questions[0].id}`, { method: 'PATCH', body: JSON.stringify({ stem: '未发布题目新题干' }) }, adminToken)
    expect(String((await call<Array<Record<string, unknown>>>('/challenges/weekly-ai/questions', {}, studentToken))[0].stem)).toBe(originalStem)
    await call(`/admin/questions/${questions[0].id}`, { method: 'PATCH', body: JSON.stringify({ status: 'published' }) }, adminToken)
    expect(String((await call<Array<Record<string, unknown>>>('/challenges/weekly-ai/questions', {}, studentToken))[0].stem)).toBe('未发布题目新题干')
    const answers = questions.map((question) => ({ questionId: question.id, answer: question.questionType === 'true_false' ? false : 'B' }))
    const result = await call<{ score: number; total: number }>('/challenges/weekly-ai/submit', {
      method: 'POST',
      headers: { 'idempotency-key': `e2e-${Date.now()}` },
      body: JSON.stringify({ answers }),
    }, studentToken)
    expect(result.total).toBe(questions.length)
    expect(result.score).toBe(100)
    const growth = await call<{ achievements: unknown[]; certificates: unknown[]; knowledgeStats: unknown[] }>(`/admin/users/${studentId}/growth`, {}, adminToken)
    expect(growth.achievements.length).toBeGreaterThan(0)
    expect(growth.certificates.length).toBeGreaterThan(0)
    expect(growth.knowledgeStats.length).toBeGreaterThan(0)
    const ranking = await call<Array<{ score: number }>>('/challenges/weekly-ai/ranking', {}, studentToken)
    expect(ranking[0].score).toBeGreaterThanOrEqual(0)
  })

  it('通知发布、学生已读与操作日志真实可查', async () => {
    const notification = await call<{ id: string }>('/admin/notifications', {
      method: 'POST',
      body: JSON.stringify({ title: `端到端通知 ${suffix}`, content: '真实通知内容。', audience: 'all' }),
    }, adminToken)
    notificationId = notification.id
    await call(`/admin/notifications/${notificationId}/publish`, { method: 'POST' }, adminToken)
    const notifications = await call<Array<{ id: string; readAt: string | null }>>('/me/notifications', {}, studentToken)
    expect(notifications.find((item) => item.id === notificationId)?.readAt).toBeNull()
    await call(`/me/notifications/${notificationId}/read`, { method: 'POST' }, studentToken)
    const read = await call<Array<{ id: string; readAt: string | null }>>('/me/notifications', {}, studentToken)
    expect(read.find((item) => item.id === notificationId)?.readAt).toBeTruthy()
    const operations = await call<Array<{ result: string }>>('/admin/operation-logs', {}, adminToken)
    expect(operations.some((item) => item.result === 'success')).toBe(true)
  })

  it('清理创建内容并验证公开接口不再返回', async () => {
    const modules = await call<Array<{ id: string; moduleKey: string; config: Record<string, unknown> }>>('/admin/homepage/modules', {}, adminToken)
    const hero = modules.find((item) => item.moduleKey === 'hero_banner')
    await call(`/admin/homepage/modules/${hero?.id}`, { method: 'PATCH', body: JSON.stringify({ config: { ...hero?.config, title: originalHeroTitle } }) }, adminToken)
    await call('/admin/homepage/publish', { method: 'POST' }, adminToken)
    await call(`/admin/courses/${courseId}/archive`, { method: 'POST' }, adminToken)
    const homepage = await call<{ modules: Array<{ moduleKey: string; items: Array<{ id: string }> }> }>('/public/homepage')
    expect(homepage.modules.find((item) => item.moduleKey === 'hero_banner')?.items.some((item) => item.id === homepageItemId)).toBe(false)
    await call(`/admin/homepage/modules/${heroModuleId}/items/${homepageItemId}`, { method: 'DELETE' }, adminToken)
    await call(`/admin/themes/${themeId}/archive`, { method: 'POST' }, adminToken)
    await call(`/admin/labs/${labId}/archive`, { method: 'POST' }, adminToken)
    await call(`/admin/resources/${resourceId}/archive`, { method: 'POST' }, adminToken)
    await call(`/admin/articles/${articleId}/archive`, { method: 'POST' }, adminToken)
    await call(`/admin/files/${fileId}`, { method: 'DELETE' }, adminToken)
    await call(`/admin/notifications/${notificationId}/archive`, { method: 'POST' }, adminToken)
    const response = await fetch(`${base}/courses/${slug}`)
    expect(response.status).toBe(404)
  })
})
