import { PrismaClient } from '@prisma/client'
import { createRequire } from 'node:module'

const prisma = new PrismaClient()
async function run() {
  if (process.env.LOAD_DEMO_DATA !== 'true') throw new Error('恢复演示数据须显式设置LOAD_DEMO_DATA=true')
  if (!await prisma.homepagePublication.count()) {
    await import('./seed')
    return
  }
  // 已初始化库只恢复普通删除操作保留的demo记录，绝不重跑全量Seed覆盖运营数据。
  const { changeDemoContent } = createRequire(__filename)('../dist/modules/media/demo-data') as typeof import('../src/modules/media/demo-data')
  console.log(JSON.stringify(await changeDemoContent(prisma, 'restore')))
}
run().catch(() => { console.error('演示Seed失败，请检查初始化配置；未执行全量覆盖'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
