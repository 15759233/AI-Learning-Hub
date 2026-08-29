import { PrismaClient, PublishStatus, LabType } from '@prisma/client'
import { hash } from 'bcryptjs'

const prisma = new PrismaClient()

const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@example.invalid'
const studentEmail = process.env.SEED_STUDENT_EMAIL || 'student@example.invalid'
const adminPassword = process.env.SEED_ADMIN_PASSWORD
const studentPassword = process.env.SEED_STUDENT_PASSWORD

if (!adminPassword || !studentPassword) {
  throw new Error('SEED_ADMIN_PASSWORD 与 SEED_STUDENT_PASSWORD 必须通过环境变量提供')
}
const requiredAdminPassword = adminPassword
const requiredStudentPassword = studentPassword

const themes = [
  ['llm', '大模型 LLM', '从基础到应用，掌握大模型核心能力', '#6e5bff'],
  ['agent', 'AI Agent', '构建智能体、自动化和决策任务', '#27b86b'],
  ['image', '图像生成', '从文生图到图像编辑与生成', '#8a5cf6'],
  ['deployment', '模型部署', '模型上线与服务化工程实践', '#3478f6'],
  ['hardware', '智能硬件', 'AI 与硬件结合，打造智能设备', '#e5a91d'],
  ['security', 'AI 安全', 'AI 安全与隐私保护最佳实践', '#16a67a'],
] as const

const courses = [
  ['llm-zero', '从零理解大语言模型', '理解 Transformer、训练与推理的核心逻辑。', 'llm', '入门', 3.5, 12600, '图文', 'LLM'],
  ['agent-first', '构建你的第一个 AI Agent', '从任务规划到工具调用，完成可运行的智能助手。', 'agent', '初级', 6.2, 9800, '实战项目', '⌘'],
  ['image-create', 'AI 绘画与创意表达', '掌握提示词、构图与负责任的图像生成。', 'image', '初级', 4.8, 8600, '互动实验', '◇'],
  ['api-deploy', '大模型部署与 API 服务化', '在受控环境理解模型服务、监控和发布。', 'deployment', '中级', 5.6, 7200, '实战项目', '⬡'],
  ['iot-car', 'AIoT 智能小车实验', '连接传感器、控制器与轻量 AI 能力。', 'hardware', '中级', 8, 6300, '互动实验', '▦'],
  ['model-security', 'AI 安全与对抗防御基础', '识别模型风险并建立负责任的安全边界。', 'security', '中级', 4, 5100, '视频', '◈'],
  ['rag-practice', 'RAG 检索增强生成实战', '用可信资料库提升模型回答的准确性。', 'llm', '高级', 6.5, 4900, '实战项目', 'RAG'],
  ['multi-agent', '多智能体协作系统构建', '设计角色、消息与可观测的协作流程。', 'agent', '高级', 9.5, 3200, '实战项目', 'A²'],
  ['image-start', '3D 生成与虚拟数字人入门', '理解生成流程、资产边界与基本工作流。', 'image', '初级', 5, 3000, '视频', '3D'],
] as const

const labs = [
  ['agent-workbench', 'AI Agent 智能助手开发实训', '在受控工作台完成规划、工具配置与运行评估。', LabType.agent, '进阶', 110, 6, 7521, '⌘'],
  ['model-service', '部署你的第一个 AI 模型', '模拟模型服务启动、检查与验证。', LabType.deployment, '中级', 90, 8, 8932, '⬡'],
  ['linux-command', 'Linux 命令训练', '使用白名单命令完成文件与进程认知任务。', LabType.command, '入门', 60, 6, 7921, '>_'],
  ['hardware', 'AI 硬件认知实验', '认识算力、传感器和边缘部署链路。', LabType.hardware, '入门', 75, 6, 8214, '▦'],
  ['rag-lab', '构建校园知识库 Agent', '组合检索、提示词和来源引用。', LabType.agent, '中级', 95, 6, 6810, 'RAG'],
  ['monitor', '模型服务监控演练', '识别模拟告警并完成健康检查。', LabType.deployment, '中级', 70, 8, 4520, 'API'],
  ['git-cli', '命令行协作入门', '用安全的模拟命令理解版本协作。', LabType.command, '入门', 55, 6, 6102, 'git'],
  ['sensor', '传感器数据采集模拟', '观察模拟数据并完成阈值判断。', LabType.hardware, '中级', 80, 6, 3980, '°C'],
] as const

const articles = [
  ['agent-tools', '从工具调用看 AI Agent 的工程边界', '理解规划、执行、反馈之间的关系，以及何时应该让人参与决策。', 'Agent', 8, ['Agent 不应直接拥有无限制工具权限。', '规划、执行和反馈形成可观察闭环。']],
  ['moe', 'MoE 为什么能让大模型更高效', '用直观方式理解专家混合架构与路由机制。', '大模型', 6, ['MoE 通过路由器选择少量专家参与计算。', '效率收益依赖稳定路由与负载均衡。']],
  ['multimodal', '多模态模型如何对齐图像与语言', '从表示空间出发，拆解跨模态学习的基本流程。', '多模态', 9, ['图像与文本先编码为可比较表示。', '数据质量决定模型是否真正理解信息。']],
  ['robot', '具身智能离校园实验还有多远', '盘点传感、规划和控制中的关键学习任务。', '机器人', 7, ['校园实验适合从仿真与受控动作开始。', '真实设备接入前必须处理安全范围。']],
  ['safety', '学生开发 AI 应用需要知道的安全边界', '从数据、权限和输出三方面建立安全意识。', 'AI 安全', 5, ['不要把密钥和无限制权限交给模型。', '输入校验与最小权限是基本安全线。']],
] as const

const resources = [
  ['resource-1', 'AI 基础学习手册 1', '学习手册', 'PDF', '大模型', 920],
  ['resource-2', '提示词结构模板 1', '提示词模板', 'DOCX', 'Agent', 1137],
  ['resource-3', 'Linux 命令速查 1', '命令速查', 'PDF', '编程工具', 1354],
  ['resource-4', '模型部署检查清单 1', '部署指南', 'PPTX', '大模型', 1571],
  ['resource-5', 'Agent 工具案例包 1', 'Agent 案例', 'ZIP', 'Agent', 1788],
  ['resource-6', '硬件接口说明 1', '硬件资料', 'TXT', '智能硬件', 2005],
] as const

async function seed() {
  const permissions = ['catalog:read', 'catalog:write', 'catalog:publish', 'user:read', 'system:write']
  for (const code of permissions) {
    await prisma.permission.upsert({ where: { code }, update: {}, create: { code, name: code } })
  }
  const adminRole = await prisma.role.upsert({ where: { code: 'admin' }, update: {}, create: { code: 'admin', name: '管理员' } })
  const studentRole = await prisma.role.upsert({ where: { code: 'student' }, update: {}, create: { code: 'student', name: '学生' } })
  const school = await prisma.school.upsert({ where: { code: 'ai-campus' }, update: {}, create: { code: 'ai-campus', name: 'AI 创客学院' } })
  const department = await prisma.department.upsert({
    where: { schoolId_code: { schoolId: school.id, code: 'computer-science' } },
    update: {},
    create: { schoolId: school.id, code: 'computer-science', name: '计算机科学与技术系' },
  })
  const allPermissions = await prisma.permission.findMany()
  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: adminRole.id, permissionId: permission.id } },
      update: {},
      create: { roleId: adminRole.id, permissionId: permission.id },
    })
  }

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash: await hash(requiredAdminPassword, 12), schoolId: school.id, departmentId: department.id },
    create: {
      username: 'admin',
      displayName: '平台管理员',
      email: adminEmail,
      passwordHash: await hash(requiredAdminPassword, 12),
      schoolId: school.id,
      departmentId: department.id,
      userType: 'admin',
      profile: { school: 'AI MAKER CAMPUS' },
    },
  })
  const student = await prisma.user.upsert({
    where: { email: studentEmail },
    update: { passwordHash: await hash(requiredStudentPassword, 12), schoolId: school.id, departmentId: department.id },
    create: {
      username: 'student',
      displayName: '造梦少年',
      email: studentEmail,
      passwordHash: await hash(requiredStudentPassword, 12),
      schoolId: school.id,
      departmentId: department.id,
      studentNo: '20260001',
      major: '计算机科学与技术',
      grade: '大二',
      profile: { school: '高校认证', program: 'AI 创客学院 · 计算机科学与技术', level: 28 },
    },
  })
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: admin.id, roleId: adminRole.id } }, update: {}, create: { userId: admin.id, roleId: adminRole.id } })
  await prisma.userRole.upsert({ where: { userId_roleId: { userId: student.id, roleId: studentRole.id } }, update: {}, create: { userId: student.id, roleId: studentRole.id } })

  const themeIds = new Map<string, string>()
  const courseIds = new Map<string, string>()
  for (const [slug, title, summary, accent] of themes) {
    const theme = await prisma.theme.upsert({
      where: { slug },
      update: {},
      create: {
        slug, title, summary, status: PublishStatus.published, sortOrder: themeIds.size + 1,
        publishedAt: new Date(), payload: { accent, icon: slug, recommended: true, pathSteps: ['入门', '初级', '中级', '高级', '实战项目', '进阶强化'] },
      },
    })
    await prisma.themeVersion.upsert({
      where: { themeId_versionNo: { themeId: theme.id, versionNo: 1 } },
      update: {},
      create: { themeId: theme.id, versionNo: 1, snapshot: { title: theme.title, summary: theme.summary, payload: theme.payload } },
    })
    themeIds.set(slug, theme.id)
  }

  for (const [slug, title, summary, themeSlug, level, hours, learners, mode, icon] of courses) {
    const course = await prisma.course.upsert({
      where: { slug },
      update: {},
      create: {
        slug, title, summary, themeId: themeIds.get(themeSlug), status: PublishStatus.published,
        sortOrder: courses.findIndex((item) => item[0] === slug) + 1, publishedAt: new Date(),
        payload: { category: themes.find((item) => item[0] === themeSlug)?.[1], level, hours, learners, mode, icon, coverVariant: themeSlug, progress: slug === 'llm-zero' ? 60 : 0 },
      },
    })
    courseIds.set(slug, course.id)
    const existing = await prisma.courseVersion.findUnique({ where: { courseId_versionNo: { courseId: course.id, versionNo: 1 } } })
    const contentVersion = existing || await prisma.courseVersion.create({
        data: {
          courseId: course.id,
          versionNo: 1,
          snapshot: { title, summary, level, hours },
          chapters: {
            create: [{
              title: '核心课程',
              description: '按结构化内容块组织的首版课程',
              sortOrder: 1,
              lessons: {
                create: [{
                  title: '核心概念与实践',
                  summary,
                  durationMinutes: Math.max(15, Math.round(hours * 12)),
                  sortOrder: 1,
                  blocks: {
                    create: [
                      { blockType: 'heading', sortOrder: 1, content: { text: title } },
                      { blockType: 'paragraph', sortOrder: 2, content: { text: summary } },
                      { blockType: 'key_points', sortOrder: 3, content: { items: ['理解关键概念', '完成受控练习', '记录学习笔记'] } },
                    ],
                  },
                }],
              },
            }],
          },
        },
      })
    await prisma.course.update({
      where: { id: course.id },
      data: { currentDraftVersionId: contentVersion.id, publishedVersionId: contentVersion.id },
    })
  }

  for (const [themeSlug, themeId] of themeIds) {
    const path = await prisma.learningPath.upsert({
      where: { themeId_name: { themeId, name: '标准学习路径' } },
      update: {},
      create: { themeId, name: '标准学习路径', description: '从入门到实践的结构化学习路径。', status: PublishStatus.published },
    })
    const stageNames = ['入门', '初级', '中级', '高级', '实战项目', '进阶强化']
    for (const [index, name] of stageNames.entries()) {
      await prisma.learningPathStage.upsert({
        where: { pathId_stageType: { pathId: path.id, stageType: `stage-${index + 1}` } },
        update: {},
        create: { pathId: path.id, name, stageType: `stage-${index + 1}`, sortOrder: index + 1 },
      })
    }
    const firstCourse = courses.find((course) => course[3] === themeSlug)
    if (firstCourse) {
      const firstStage = await prisma.learningPathStage.findUnique({ where: { pathId_stageType: { pathId: path.id, stageType: 'stage-1' } } })
      const courseId = courseIds.get(firstCourse[0])
      if (firstStage && courseId) {
        await prisma.pathContent.upsert({
          where: { stageId_targetType_targetId: { stageId: firstStage.id, targetType: 'course', targetId: courseId } },
          update: {},
          create: { stageId: firstStage.id, targetType: 'course', targetId: courseId },
        })
      }
    }
  }

  for (const [slug, title, summary, labType, level, minutes, stepCount, learners, icon] of labs) {
    const lab = await prisma.lab.upsert({
      where: { slug },
      update: {},
      create: {
        slug, title, summary, labType, status: PublishStatus.published, sortOrder: labs.findIndex((item) => item[0] === slug) + 1,
        publishedAt: new Date(), payload: { category: labType === 'command' ? 'Linux 命令' : labType === 'deployment' ? '模型部署' : labType === 'hardware' ? '智能硬件' : 'AI Agent', level, minutes, steps: stepCount, learners, icon, completion: 0, coverVariant: labType },
      },
    })
    if (await prisma.labStep.count({ where: { labId: lab.id } }) === 0) {
      for (let index = 1; index <= Math.min(stepCount, 6); index += 1) {
        await prisma.labStep.create({
          data: {
            labId: lab.id, stepKey: `step-${index}`, title: `步骤 ${index}`, description: '按说明完成受控模拟操作。',
            sortOrder: index, instruction: { type: 'guided' }, validator: { allowed: true }, score: 10,
          },
        })
      }
    }
    const steps = await prisma.labStep.findMany({ where: { labId: lab.id }, orderBy: { sortOrder: 'asc' } })
    const labVersion = await prisma.labVersion.upsert({
      where: { labId_versionNo: { labId: lab.id, versionNo: 1 } },
      update: {},
      create: { labId: lab.id, versionNo: 1, snapshot: JSON.parse(JSON.stringify({ title: lab.title, summary: lab.summary, payload: lab.payload, labType: lab.labType, steps })) },
    })
    await prisma.lab.update({ where: { id: lab.id }, data: { currentDraftVersionId: labVersion.id, publishedVersionId: labVersion.id } })
  }

  for (const [slug, title, category, format, theme, downloads] of resources) {
    const resource = await prisma.resource.upsert({
      where: { slug },
      update: {},
      create: {
        slug, title, summary: `${title}，用于课程学习与实践参考。`, category, format, status: PublishStatus.published,
        sortOrder: resources.findIndex((item) => item[0] === slug) + 1, downloadCount: downloads, publishedAt: new Date(),
        payload: { theme, difficulty: '入门', featured: downloads % 2 === 0, updatedAt: '2026-08-28', icon: format },
      },
    })
    await prisma.resourceVersion.upsert({
      where: { resourceId_versionNo: { resourceId: resource.id, versionNo: 1 } },
      update: {},
      create: { resourceId: resource.id, versionNo: 1, snapshot: { title: resource.title, summary: resource.summary, payload: resource.payload } },
    })
  }
  for (const [index, name] of ['学习手册', '提示词模板', '部署指南', 'Agent 案例', '命令速查', '硬件资料'].entries()) {
    await prisma.resourceCategory.upsert({ where: { code: `resource-${index + 1}` }, update: {}, create: { code: `resource-${index + 1}`, name, sortOrder: index + 1 } })
  }

  for (const [slug, title, summary, category, readMinutes, content] of articles) {
    const article = await prisma.article.upsert({
      where: { slug },
      update: {},
      create: {
        slug, title, summary, category, status: PublishStatus.published, sortOrder: articles.findIndex((item) => item[0] === slug) + 1,
        publishedAt: new Date(), payload: { readMinutes, content, icon: category, coverVariant: category === '大模型' ? 'llm' : category === 'Agent' ? 'agent' : 'image' },
      },
    })
    if (slug === 'agent-tools') {
      await prisma.articleRecommendation.upsert({
        where: { articleId_positionKey: { articleId: article.id, positionKey: 'frontier_hero' } },
        update: {},
        create: { articleId: article.id, positionKey: 'frontier_hero', sortOrder: 1 },
      })
    }
    const articleVersion = await prisma.articleVersion.upsert({
      where: { articleId_versionNo: { articleId: article.id, versionNo: 1 } },
      update: {},
      create: { articleId: article.id, versionNo: 1, snapshot: { title: article.title, summary: article.summary, category: article.category, payload: article.payload } },
    })
    await prisma.article.update({ where: { id: article.id }, data: { currentDraftVersionId: articleVersion.id, publishedVersionId: articleVersion.id } })
  }
  for (const [index, name] of ['大模型', 'Agent', '多模态', '机器人', 'AI 安全'].entries()) {
    await prisma.articleCategory.upsert({ where: { code: `article-${index + 1}` }, update: {}, create: { code: `article-${index + 1}`, name, sortOrder: index + 1 } })
  }

  await prisma.challenge.upsert({
    where: { slug: 'weekly-ai' },
    update: {},
    create: {
      slug: 'weekly-ai', title: 'AI 基础能力突破赛', summary: '覆盖模型基础、数据处理、AI 应用与安全边界。',
      status: PublishStatus.published, publishedAt: new Date(), targetScore: 80, rewardPoints: 300,
      payload: { questionCount: 30, durationMinutes: 45, participants: 12860 },
    },
  })

  const bank = await prisma.questionBank.upsert({
    where: { id: 'seed-ai-basics' },
    update: {},
    create: { id: 'seed-ai-basics', name: 'AI 基础能力题库', status: PublishStatus.published },
  })
  await prisma.challenge.update({ where: { slug: 'weekly-ai' }, data: { questionBankId: bank.id } })
  const questionSeeds = [
    ['seed-q-attention', 'single', '入门', '注意力机制的主要作用是？', ['A. 直接提升参数规模', 'B. 捕捉序列中不同位置的关联', 'C. 替代全部数据清洗'], 'B', '捕捉序列中不同位置之间的关联。'],
    ['seed-q-agent', 'true_false', '入门', 'AI Agent 可以直接拥有无限制系统权限。', ['正确', '错误'], false, '智能体工具必须遵循白名单与最小权限。'],
  ] as const
  for (const [id, questionType, difficulty, stem, options, answer, analysis] of questionSeeds) {
    const question = await prisma.question.upsert({
      where: { id },
      update: {},
      create: {
        id,
        bankId: bank.id,
        questionType,
        difficulty,
        status: PublishStatus.published,
        stem,
        options,
        standardAnswer: answer,
        analysis,
      },
    })
    const questionVersion = await prisma.questionVersion.upsert({
      where: { questionId_versionNo: { questionId: question.id, versionNo: 1 } },
      update: {},
      create: { questionId: question.id, versionNo: 1, snapshot: { stem, options, standardAnswer: answer, analysis } },
    })
    await prisma.question.update({ where: { id: question.id }, data: { currentDraftVersionId: questionVersion.id, publishedVersionId: questionVersion.id } })
    await prisma.questionOption.deleteMany({ where: { questionId: question.id } })
    for (const [index, content] of options.entries()) {
      await prisma.questionOption.create({ data: { questionId: question.id, optionKey: String.fromCharCode(65 + index), content: String(content), sortOrder: index + 1 } })
    }
  }

  await prisma.achievement.upsert({
    where: { code: 'first-lab' },
    update: {},
    create: { code: 'first-lab', name: '首次实践', description: '完成第一次受控实训提交。', rule: { event: 'lab_submit', count: 1 } },
  })
  await prisma.achievement.upsert({
    where: { code: 'first-assessment' },
    update: {},
    create: { code: 'first-assessment', name: '初次挑战', description: '完成第一次统一测评。', rule: { event: 'assessment_submit', count: 1 } },
  })
  await prisma.certificate.upsert({
    where: { code: 'ai-basics-pass' },
    update: {},
    create: { code: 'ai-basics-pass', name: 'AI 基础能力证书', description: '统一测评成绩达到通过线。', rule: { event: 'assessment_pass', challenge: 'weekly-ai' } },
  })
  for (const [index, moduleKey] of ['overview', 'ability_card', 'badges', 'recent_courses', 'lab_records', 'favorites', 'plans', 'growth_stats'].entries()) {
    await prisma.growthModuleSetting.upsert({
      where: { moduleKey },
      update: {},
      create: { moduleKey, title: moduleKey, sortOrder: index + 1, displayLimit: 6 },
    })
  }

  const notification = await prisma.notification.findFirst({ where: { title: '欢迎使用 AI 数智化学习平台' } })
  if (!notification) {
    await prisma.notification.create({
      data: { title: '欢迎使用 AI 数智化学习平台', content: '从学习主题开始，完成一次课程或受控实训。', status: PublishStatus.published, publishedAt: new Date() },
    })
  }

  const moduleSeeds = [
    ['hero_banner', '首屏 Banner', { title: '学 AI，不止是听懂。还要亲手做出来。' }],
    ['ai_direction', 'AI 方向入口', {}],
    ['weekly_featured', '本周值得投入时间的内容', {}],
    ['featured_labs', '真正动手实训', {}],
    ['frontier_news', 'AI 世界，本周更新', {}],
    ['resource_tools', '工具、模板与资料', {}],
    ['weekly_challenge', '本周 AI 能力挑战', {}],
    ['growth_summary', '用户学习成长记录', {}],
  ] as const
  for (const [moduleKey, name, config] of moduleSeeds) {
    const module = await prisma.homepageModule.upsert({
      where: { moduleKey },
      update: {},
      create: { moduleKey, name, config, status: PublishStatus.published, publishedAt: new Date(), sortOrder: moduleSeeds.findIndex((item) => item[0] === moduleKey) + 1 },
    })
    const moduleVersion = await prisma.homepageModuleVersion.upsert({
      where: { moduleId_versionNo: { moduleId: module.id, versionNo: 1 } },
      update: {},
      create: { moduleId: module.id, versionNo: 1, snapshot: { moduleKey, name, moduleType: module.moduleType, enabled: true, sortOrder: module.sortOrder, config, items: [] } },
    })
    await prisma.homepageModule.update({ where: { id: module.id }, data: { currentDraftVersionId: moduleVersion.id, publishedVersionId: moduleVersion.id } })
  }
  const publishedModules = await prisma.homepageModule.findMany({
    where: { enabled: true, status: PublishStatus.published },
    orderBy: { sortOrder: 'asc' },
    include: { items: { where: { enabled: true }, orderBy: { sortOrder: 'asc' } } },
  })
  await prisma.homepagePublication.upsert({
    where: { version: 1 },
    update: {},
    create: { version: 1, snapshot: JSON.parse(JSON.stringify(publishedModules)) },
  })

  if (await prisma.growthPoint.count({ where: { userId: student.id } }) === 0) {
    await prisma.growthPoint.createMany({
      data: [
        { userId: student.id, eventType: 'seed_learning', points: 120, reference: 'llm-zero' },
        { userId: student.id, eventType: 'seed_challenge', points: 80, reference: 'weekly-ai' },
      ],
    })
  }
}

seed()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    await prisma.$disconnect()
    throw error
  })
