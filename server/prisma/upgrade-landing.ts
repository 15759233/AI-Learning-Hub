import { PrismaClient } from '@prisma/client'
import { upgradeLanding } from '../src/modules/homepage/upgrade-landing'

const prisma = new PrismaClient()
upgradeLanding(prisma).then((result) => console.log(JSON.stringify(result)))
  .catch((error: unknown) => { console.error(error instanceof Error ? error.message : '落地页升级失败'); process.exitCode = 1 })
  .finally(() => prisma.$disconnect())
