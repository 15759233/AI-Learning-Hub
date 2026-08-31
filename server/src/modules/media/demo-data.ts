import { Prisma, PrismaClient } from '@prisma/client'
import { lockFileReferences } from '../../common/persistence'
import { catalogTables } from './media-usage'

/** 演示内容是普通软删除记录。共享素材、用户、版本、章节和发布指针始终保留。 */
export async function changeDemoContent(prisma: PrismaClient, mode: 'preview' | 'delete' | 'restore' = 'preview') {
  const counts: Record<string, number> = {}
  const actor = mode === 'preview' ? null : await prisma.user.findFirst({ where: { status: 'active', userRoles: { some: { role: { code: { in: ['admin', 'super_admin'] } } } } }, orderBy: { createdAt: 'asc' }, select: { id: true } })
  if (mode !== 'preview' && !actor) throw new Error('请先初始化必要管理员')
  await prisma.$transaction(async (tx) => {
    await lockFileReferences(tx)
    for (const [type, table] of catalogTables) {
      const deleted = mode === 'restore' ? Prisma.sql`IS NOT NULL` : Prisma.sql`IS NULL`
      const rows = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`SELECT id FROM ${Prisma.raw(table)} WHERE data_origin='demo_seed' AND deleted_at ${deleted}`)
      counts[type] = rows.length
      if (!rows.length || mode === 'preview') continue
      if (mode === 'delete') {
        await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(table)} SET deleted_at=now(),status='archived',version=version+1,updated_at=now() WHERE data_origin='demo_seed' AND deleted_at IS NULL`)
      } else {
        await tx.$executeRaw(Prisma.sql`UPDATE ${Prisma.raw(table)} SET deleted_at=NULL,status=CASE WHEN published_version_id IS NULL THEN 'draft'::"PublishStatus" ELSE 'published'::"PublishStatus" END,version=version+1,updated_at=now() WHERE data_origin='demo_seed' AND deleted_at IS NOT NULL`)
      }
    }
    if (actor) await tx.auditLog.create({ data: { actorId: actor.id, action: `demo_content_${mode}`, targetType: 'catalog', targetId: 'demo_seed', details: counts } })
  }, { timeout: 20000 })
  return { mode, counts }
}
if (require.main === module) {
  const prisma = new PrismaClient(), apply = process.argv.includes('--apply')
  const run = async () => {
    if (apply && process.env.DEMO_CLEANUP_CONFIRM !== 'SOFT_DELETE_DEMO_ONLY') throw new Error('实际清理须设置DEMO_CLEANUP_CONFIRM=SOFT_DELETE_DEMO_ONLY')
    console.log(JSON.stringify(await changeDemoContent(prisma, apply ? 'delete' : 'preview')))
  }
  run().catch(() => { console.error('演示内容清理失败；未改变媒体、用户和历史版本'); process.exitCode = 1 }).finally(() => prisma.$disconnect())
}
