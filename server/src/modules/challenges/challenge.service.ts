import { Injectable, NotFoundException } from '@nestjs/common'
import { Prisma, PublishStatus } from '@prisma/client'
import { ContentSupportService } from '../../common/content/content-support.service'
import { PrismaService } from '../../prisma/prisma.service'
import type { PageQueryDto } from '../../common/content/page-query.dto'
import type { CreateChallengeDto, UpdateChallengeDto } from './challenge.dto'
import { readChallengeSnapshot } from './challenge-version'

const dataFields = ['coverAssetId', 'startAt', 'endAt', 'leaderboardEnabled', 'integration']

@Injectable()
export class ChallengeService {
  constructor(private readonly prisma: PrismaService, private readonly support: ContentSupportService) {}
  remove(id: string, actorId: string) { return this.support.remove('challenge', id, actorId) }

  async list(query: PageQueryDto, publicOnly = false) {
    const where = this.support.where(query, publicOnly)
    const [items, total] = await this.prisma.$transaction([
      this.prisma.challenge.findMany({ ...this.support.page(query), where, include: { publishedVersion: true } }),
      this.prisma.challenge.count({ where }),
    ])
    const covers = await this.support.media.prepare(items, publicOnly)
    return {
      items: await Promise.all(items.map(async (item) => {
        const published = publicOnly ? readChallengeSnapshot(item.publishedVersion?.snapshot) : null
        return {
          ...await this.support.render('challenge', {
            ...item,
            title: published?.title || item.title,
            summary: published?.summary || item.summary,
          }, !publicOnly, published?.data || this.support.data(item.payload), covers),
          challengeType: published?.challengeType || item.challengeType,
          targetScore: published?.targetScore ?? item.targetScore,
          rewardPoints: published?.rewardPoints ?? item.rewardPoints,
        }
      })),
      page: query.page,
      pageSize: query.pageSize,
      total,
    }
  }

  async detail(value: string, publicOnly = false) {
    const item = await this.prisma.challenge.findFirst({
      where: { OR: [{ id: value }, { slug: value }], deletedAt: null, ...(publicOnly ? { status: PublishStatus.published } : {}) },
      include: { rules: true, currentDraftVersion: true, publishedVersion: true, versions: { orderBy: { versionNo: 'desc' } } },
    })
    if (!item) throw new NotFoundException('挑战不存在')
    const published = publicOnly ? readChallengeSnapshot(item.publishedVersion?.snapshot) : null
    return {
      ...await this.support.render('challenge', {
        ...item,
        title: published?.title || item.title,
        summary: published?.summary || item.summary,
      }, !publicOnly, published?.data || this.support.data(item.payload)),
      challengeType: published?.challengeType || item.challengeType,
      targetScore: published?.targetScore ?? item.targetScore,
      rewardPoints: published?.rewardPoints ?? item.rewardPoints,
      ...(!publicOnly ? {
        questionBankId: item.questionBankId,
        paperId: item.paperId,
        rules: item.rules,
        currentDraftVersionId: item.currentDraftVersionId,
        publishedVersionId: item.publishedVersionId,
        versions: item.versions.map((version) => ({ id: version.id, versionNo: version.versionNo, createdAt: version.createdAt.toISOString() })),
      } : {}),
    }
  }

  async create(input: CreateChallengeDto, actorId: string) {
    const data = { coverAssetId: null, ...this.support.pick(input, dataFields) }
    const item = await this.prisma.$transaction(async (tx) => {
      await this.support.binding(tx, input.coverAssetId)
      const challenge = await tx.challenge.create({
        data: {
          coverAssetId: input.coverAssetId || null,
          slug: input.slug,
          title: input.title,
          summary: input.summary,
          sortOrder: input.sortOrder,
          challengeType: input.challengeType,
          targetScore: input.targetScore,
          rewardPoints: input.rewardPoints,
          payload: this.support.sanitize(data),
        },
      })
      const version = await tx.challengeVersion.create({
        data: {
          challengeId: challenge.id,
          versionNo: 1,
          snapshot: this.support.json({
            title: challenge.title,
            summary: challenge.summary,
            challengeType: challenge.challengeType,
            targetScore: challenge.targetScore,
            rewardPoints: challenge.rewardPoints,
            questionBankId: null,
            paperId: null,
            data,
            rules: [],
          }),
        },
      })
      return tx.challenge.update({ where: { id: challenge.id }, data: { currentDraftVersionId: version.id } })
    })
    await this.support.audit(actorId, 'create', 'challenges', item.id)
    return this.support.render('challenge', item, true)
  }

  async update(id: string, input: UpdateChallengeDto, actorId: string) {
    const item = await this.prisma.$transaction(async (tx) => {
      await this.support.binding(tx, input.coverAssetId)
      await this.ensureDraft(id, tx)
      const current = await tx.challenge.findUniqueOrThrow({ where: { id } })
      const data = { ...this.support.data(current.payload), ...this.support.pick(input, dataFields) }
      const challenge = await tx.challenge.update({ where: { id }, data: {
        ...this.support.pick(input, ['title', 'summary', 'sortOrder', 'challengeType', 'targetScore', 'rewardPoints', 'coverAssetId']), payload: this.support.sanitize(data), version: { increment: 1 },
      } })
      await this.refreshDraft(id, tx)
      return challenge
    })
    await this.support.audit(actorId, 'update', 'challenges', id)
    return this.support.render('challenge', item, true)
  }

  async setPublished(id: string, published: boolean, actorId: string) {
    const item = await this.prisma.$transaction(async (tx) => {
      await this.support.binding(tx, undefined)
      const draftId = published ? await this.ensureDraft(id, tx) : null
      if (published) await this.refreshDraft(id, tx)
      return tx.challenge.update({ where: { id }, data: published
        ? { status: PublishStatus.published, publishedAt: new Date(), publishedVersionId: draftId, version: { increment: 1 } }
        : { status: PublishStatus.archived, version: { increment: 1 } } })
    })
    await this.support.audit(actorId, published ? 'publish' : 'archive', 'challenges', id)
    return this.support.render('challenge', item, true)
  }

  async linkQuestionBank(id: string, questionBankId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.support.binding(tx, undefined)
      await this.ensureDraft(id, tx)
      await tx.challenge.update({ where: { id }, data: { questionBankId } })
      await this.refreshDraft(id, tx)
    })
    return this.detail(id)
  }

  async linkPaper(id: string, paperId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.support.binding(tx, undefined)
      await this.ensureDraft(id, tx)
      await tx.challenge.update({ where: { id }, data: { paperId } })
      await this.refreshDraft(id, tx)
    })
    return this.detail(id)
  }

  private async ensureDraft(challengeId: string, tx: Prisma.TransactionClient): Promise<string> {
    const challenge = await tx.challenge.findUnique({
      where: { id: challengeId, deletedAt: null },
      include: { currentDraftVersion: true, _count: { select: { versions: true } } },
    })
    if (!challenge) throw new NotFoundException('挑战不存在')
    if (challenge.currentDraftVersionId && challenge.currentDraftVersionId !== challenge.publishedVersionId) return challenge.currentDraftVersionId
    const version = await tx.challengeVersion.create({
      data: {
        challengeId,
        versionNo: challenge._count.versions + 1,
        snapshot: (challenge.currentDraftVersion?.snapshot || this.support.json({
          title: challenge.title,
          summary: challenge.summary,
          challengeType: challenge.challengeType,
          targetScore: challenge.targetScore,
          rewardPoints: challenge.rewardPoints,
          questionBankId: challenge.questionBankId,
          paperId: challenge.paperId,
          data: this.support.data(challenge.payload),
          rules: [],
        })) as Prisma.InputJsonValue,
      },
    })
    await tx.challenge.update({ where: { id: challengeId }, data: { currentDraftVersionId: version.id } })
    return version.id
  }

  private async refreshDraft(challengeId: string, tx: Prisma.TransactionClient) {
    const challenge = await tx.challenge.findUnique({ where: { id: challengeId }, include: { rules: { orderBy: { ruleKey: 'asc' } } } })
    if (!challenge?.currentDraftVersionId) throw new NotFoundException('挑战草稿不存在')
    await tx.challengeVersion.update({
      where: { id: challenge.currentDraftVersionId },
      data: {
        snapshot: this.support.json({
          title: challenge.title,
          summary: challenge.summary,
          challengeType: challenge.challengeType,
          targetScore: challenge.targetScore,
          rewardPoints: challenge.rewardPoints,
          questionBankId: challenge.questionBankId,
          paperId: challenge.paperId,
          data: this.support.data(challenge.payload),
          rules: challenge.rules,
        }),
      },
    })
  }
}
