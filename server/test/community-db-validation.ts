import { PrismaClient } from '@prisma/client'
import { execFileSync } from 'node:child_process'
import { writeFileSync } from 'node:fs'
import { createHash } from 'node:crypto'

const url = process.env.DATABASE_URL || ''
if (!url.includes('127.0.0.1:55439/community_')) throw new Error('只允许隔离本地 community 验收数据库')
const prisma = new PrismaClient()
const mode = process.argv[2]
async function main() {
  if (mode === 'prepare-baseline') {
    const dump = execFileSync('docker', ['exec', 'ai-learning-community-validation', 'pg_dump', '-U', 'postgres', '--data-only', '--exclude-table=community_*', '--exclude-table=user_notifications', '--exclude-table=user_feed_signal_snapshots', '--exclude-table=_prisma_migrations', '--exclude-table=activity_events', 'community_fresh'], { maxBuffer: 20 * 1024 * 1024 })
    execFileSync('docker', ['exec', '-i', '-e', 'PGOPTIONS=-c session_replication_role=replica', 'ai-learning-community-validation', 'psql', '-U', 'postgres', '-d', 'community_baseline', '-v', 'ON_ERROR_STOP=1', '--single-transaction'], { input: dump, stdio: ['pipe', 'ignore', 'pipe'] })
    const module = await prisma.homepageModule.findFirstOrThrow({ orderBy: { sortOrder: 'asc' } })
    await prisma.homepageModule.update({ where: { id: module.id }, data: { name: '升级前已有运营配置' } })
    const publication = await prisma.homepagePublication.findFirstOrThrow({ orderBy: { version: 'desc' } })
    await prisma.homepagePublication.create({ data: { version: publication.version + 1, snapshot: publication.snapshot! } })
    console.log(JSON.stringify({ baselinePrepared: true, modules: await prisma.homepageModule.count(), publications: await prisma.homepagePublication.count() }))
    return
  }
  const publications = await prisma.homepagePublication.findMany({ orderBy: { version: 'asc' } })
  const modules = await prisma.homepageModule.findMany({ orderBy: { id: 'asc' } })
  if (mode === 'legacy') {
    const result = { publicationCount: publications.length, moduleCount: modules.length, publicationHash: createHash('sha256').update(JSON.stringify(publications)).digest('hex'), moduleHash: createHash('sha256').update(JSON.stringify(modules)).digest('hex') }
    if (process.env.EVIDENCE_OUTPUT) writeFileSync(process.env.EVIDENCE_OUTPUT, JSON.stringify(result, null, 2))
    console.log(JSON.stringify(result)); return
  }
  const result = {
    users: await prisma.user.count(), posts: await prisma.communityPost.count(), comments: await prisma.communityComment.count(),
    topics: await prisma.communityTopic.count(), reactions: await prisma.communityPostReaction.count(),
    types: await prisma.communityPost.groupBy({ by: ['postType'], _count: true, orderBy: { postType: 'asc' } }),
    verified: await prisma.communityProfile.groupBy({ by: ['verifiedType'], _count: true, orderBy: { verifiedType: 'asc' } }),
    publicationCount: publications.length, moduleCount: modules.length,
    publicationHash: createHash('sha256').update(JSON.stringify(publications)).digest('hex'),
    moduleHash: createHash('sha256').update(JSON.stringify(modules)).digest('hex'),
    invalidBindings: await prisma.communityPostBinding.count({ where: { titleSnapshot: '' } }),
  }
  if (process.env.EVIDENCE_OUTPUT) writeFileSync(process.env.EVIDENCE_OUTPUT, JSON.stringify(result, null, 2))
  console.log(JSON.stringify(result))
}
void main().finally(() => prisma.$disconnect())
