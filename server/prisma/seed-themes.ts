import { PrismaClient, PublishStatus } from '@prisma/client'

const prisma = new PrismaClient()

const themes = [
  {
    slug: 'llm',
    title: '大模型 LLM',
    summary: '从通识、Transformer 到 RAG 与部署，建立大模型完整知识框架。',
    sortOrder: 1,
    data: {
      subtitle: '从原理到工程的大模型学习路径',
      introduction: '覆盖大模型原理、提示词、RAG 与微调，帮助你建立大模型完整知识框架。',
      icon: 'brain',
      accent: '#7C5CFC',
      recommended: true,
      recommendedCourseIds: [],
      relatedLabIds: [],
      relatedResourceIds: [],
      learners: 15680,
      completionRate: 72,
      courseCount: 6,
      hours: 30,
      coverVariant: 'llm',
    },
  },
  {
    slug: 'agent',
    title: 'AI Agent',
    summary: '学习工具调用、任务规划、记忆与多智能体协作。',
    sortOrder: 2,
    data: {
      subtitle: '构建可运行的智能体',
      introduction: '从任务规划到工具调用，完成可运行的智能助手。',
      icon: 'bot',
      accent: '#2E9E6B',
      recommended: true,
      recommendedCourseIds: [],
      relatedLabIds: [],
      relatedResourceIds: [],
      learners: 9800,
      completionRate: 62,
      courseCount: 5,
      hours: 32,
      coverVariant: 'agent',
    },
  },
  {
    slug: 'deployment',
    title: '模型部署',
    summary: '掌握 Linux、Docker、FastAPI、vLLM 与服务监控。',
    sortOrder: 3,
    data: {
      subtitle: '把模型变成可用服务',
      introduction: '掌握 Linux、Docker、FastAPI 与 vLLM，让模型稳定对外提供服务。',
      icon: 'server',
      accent: '#2F7FE0',
      recommended: true,
      recommendedCourseIds: [],
      relatedLabIds: [],
      relatedResourceIds: [],
      learners: 10800,
      completionRate: 66,
      courseCount: 4,
      hours: 21,
      coverVariant: 'deployment',
    },
  },
]

async function seed() {
  for (const theme of themes) {
    const existing = await prisma.theme.findUnique({ where: { slug: theme.slug } })
    if (existing) {
      console.log(`skip (exists): ${theme.slug}`)
      continue
    }
    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.theme.create({
        data: {
          slug: theme.slug,
          title: theme.title,
          summary: theme.summary,
          sortOrder: theme.sortOrder,
          payload: theme.data as object,
          status: PublishStatus.published,
          publishedAt: new Date(),
        },
      })
      const version = await tx.themeVersion.create({
        data: {
          themeId: created.id,
          versionNo: 1,
          snapshot: {
            title: theme.title,
            summary: theme.summary,
            data: theme.data,
            paths: [],
          } as object,
        },
      })
      return tx.theme.update({
        where: { id: created.id },
        data: { currentDraftVersionId: version.id, publishedVersionId: version.id },
      })
    })
    console.log(`created + published: ${item.slug} (${item.id})`)
  }
}

seed()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())