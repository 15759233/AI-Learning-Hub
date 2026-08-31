import { PrismaClient } from '@prisma/client'
import { createHash } from 'node:crypto'
const prisma = new PrismaClient()
async function audit() {
  const rows = await prisma.$queryRaw<Array<{ kind: string; value: string; ids: string[] }>>`
    SELECT 'email' AS kind,lower(email) AS value,array_agg(id) AS ids FROM users GROUP BY lower(email) HAVING count(*)>1
    UNION ALL SELECT 'username',lower(username),array_agg(id) FROM users GROUP BY lower(username) HAVING count(*)>1`
  console.log(JSON.stringify({ conflicts: rows.map((row) => ({ kind: row.kind, fingerprint: createHash('sha256').update(row.value).digest('hex').slice(0, 12), ids: row.ids })), safeToMigrate: rows.length === 0 }))
  if (rows.length) process.exitCode = 1
}
void audit().catch(() => { console.error('数据库审计失败'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
