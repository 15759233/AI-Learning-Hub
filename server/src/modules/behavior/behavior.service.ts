import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common'
import { LabRunStatus, Prisma } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { PrismaService } from '../../prisma/prisma.service'
import type { LabActionDto, SubmitAssessmentDto } from './behavior.dto'

type VersionedQuestion = Prisma.QuestionGetPayload<{ include: { publishedVersion: true } }>
const publishedQuestion = (question: VersionedQuestion) => {
  const snapshot = question.publishedVersion?.snapshot && typeof question.publishedVersion.snapshot === 'object' && !Array.isArray(question.publishedVersion.snapshot)
    ? question.publishedVersion.snapshot as Record<string, unknown>
    : {}
  return {
    ...question,
    stem: String(snapshot.stem || question.stem),
    options: (snapshot.options || question.options) as Prisma.JsonValue,
    standardAnswer: (snapshot.standardAnswer ?? question.standardAnswer) as Prisma.JsonValue,
    analysis: String(snapshot.analysis || question.analysis),
  }
}

@Injectable()
export class BehaviorService {
  constructor(private readonly prisma: PrismaService) {}

  async setProgress(userId: string, lessonId: string, progress: number) {
    const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId }, include: { chapter: { include: { version: true } } } })
    if (!lesson) throw new NotFoundException('课时不存在')
    const courseId = lesson.chapter.version.courseId
    const result = await this.prisma.$transaction(async (tx) => {
      const record = await tx.lessonProgress.upsert({
        where: { userId_courseId_lessonId: { userId, courseId, lessonId } },
        update: { progress, completedAt: progress === 100 ? new Date() : null },
        create: { userId, courseId, lessonId, progress, completedAt: progress === 100 ? new Date() : null },
      })
      await tx.activityEvent.create({ data: { userId, eventType: progress === 100 ? 'lesson_complete' : 'lesson_progress', targetType: 'lesson', targetId: lessonId, payload: { progress } } })
      if (progress === 100) await tx.growthPoint.create({ data: { userId, eventType: 'lesson_complete', points: 10, reference: lessonId } })
      return record
    })
    return result
  }

  async setCourseProgress(userId: string, courseIdOrSlug: string, progress: number) {
    const course = await this.prisma.course.findFirst({
      where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }], status: 'published' },
      include: { versions: { orderBy: { versionNo: 'desc' }, take: 1, include: { chapters: { orderBy: { sortOrder: 'asc' }, take: 1, include: { lessons: { orderBy: { sortOrder: 'asc' }, take: 1 } } } } } },
    })
    const lesson = course?.versions[0]?.chapters[0]?.lessons[0]
    if (!course || !lesson) throw new NotFoundException('课程或课时不存在')
    return this.setProgress(userId, lesson.id, progress)
  }

  async saveNote(userId: string, lessonId: string, content: string) {
    const lesson = await this.prisma.courseLesson.findUnique({ where: { id: lessonId }, include: { chapter: { include: { version: true } } } })
    if (!lesson) throw new NotFoundException('课时不存在')
    return this.prisma.learningNote.upsert({
      where: { userId_courseId: { userId, courseId: lesson.chapter.version.courseId } },
      update: { content },
      create: { userId, courseId: lesson.chapter.version.courseId, content },
    })
  }

  async saveCourseNote(userId: string, courseIdOrSlug: string, content: string) {
    const course = await this.prisma.course.findFirst({ where: { OR: [{ id: courseIdOrSlug }, { slug: courseIdOrSlug }], status: 'published' } })
    if (!course) throw new NotFoundException('课程不存在')
    return this.prisma.learningNote.upsert({
      where: { userId_courseId: { userId, courseId: course.id } },
      update: { content },
      create: { userId, courseId: course.id, content },
    })
  }

  async startLab(userId: string, labIdOrSlug: string) {
    const lab = await this.prisma.lab.findFirst({ where: { OR: [{ id: labIdOrSlug }, { slug: labIdOrSlug }], status: 'published', deletedAt: null } })
    if (!lab) throw new NotFoundException('实训不存在或未发布')
    return this.prisma.$transaction(async (tx) => {
      const run = await tx.labRun.create({ data: { userId, labId: lab.id, labVersion: lab.version, labVersionId: lab.publishedVersionId, status: LabRunStatus.ready } })
      await tx.labRunEvent.create({ data: { runId: run.id, sequence: 1, type: 'log', step: 'ready', message: '受控实训环境已准备' } })
      await tx.labRunSnapshot.create({ data: { runId: run.id, sequence: 1, state: JSON.parse(JSON.stringify(run)) as Prisma.InputJsonValue } })
      await tx.activityEvent.create({ data: { userId, eventType: 'lab_start', targetType: 'lab', targetId: lab.id } })
      return run
    })
  }

  async actOnLab(userId: string, runId: string, input: LabActionDto) {
    const run = await this.prisma.labRun.findFirst({ where: { id: runId, userId } })
    if (!run) throw new NotFoundException('实训运行不存在')
    const allowed = ['start', 'next', 'complete', 'stop']
    if (!allowed.includes(input.action)) throw new BadRequestException('不支持的受控动作')
    const state = input.action === 'start'
      ? { status: LabRunStatus.running, progress: Math.max(10, run.progress) }
      : input.action === 'next'
        ? { status: LabRunStatus.running, currentStep: run.currentStep + 1, progress: Math.min(90, run.progress + 20) }
        : input.action === 'complete'
          ? { status: LabRunStatus.success, progress: 100, completedAt: new Date(), score: 80 }
          : { status: LabRunStatus.stopped }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.labRun.update({ where: { id: run.id }, data: state })
      const sequence = await tx.labRunEvent.count({ where: { runId } }) + 1
      await tx.labRunEvent.create({ data: { runId, sequence, type: 'state', step: input.action, message: `实训状态已更新为 ${updated.status}` } })
      await tx.labRunSnapshot.create({ data: { runId, sequence, state: JSON.parse(JSON.stringify(updated)) as Prisma.InputJsonValue } })
      return updated
    })
  }

  async submitLab(userId: string, runId: string) {
    const run = await this.prisma.labRun.findFirst({ where: { id: runId, userId } })
    if (!run || run.status !== LabRunStatus.success) throw new BadRequestException('实训完成后才能提交')
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.labRun.update({ where: { id: run.id }, data: { status: LabRunStatus.submitted, submittedAt: new Date() } })
      const eventCount = await tx.labRunEvent.count({ where: { runId } })
      await tx.labReport.upsert({
        where: { runId },
        update: { summary: { passed: true, score: updated.score, eventCount } },
        create: { runId, summary: { passed: true, score: updated.score, eventCount } },
      })
      await tx.growthPoint.create({ data: { userId, eventType: 'lab_submit', points: 60, reference: runId } })
      await tx.activityEvent.create({ data: { userId, eventType: 'lab_complete', targetType: 'lab', targetId: run.labId } })
      const achievement = await tx.achievement.findUnique({ where: { code: 'first-lab' } })
      if (achievement?.enabled) {
        await tx.userAchievement.upsert({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
          update: {},
          create: { userId, achievementId: achievement.id, evidence: { runId } },
        })
      }
      return updated
    })
  }

  async submitAssessment(userId: string, challengeSlug: string, input: SubmitAssessmentDto, idempotencyKey?: string) {
    if (!idempotencyKey) throw new BadRequestException('提交测评必须提供 Idempotency-Key')
    const cached = await this.prisma.idempotencyKey.findUnique({ where: { key: idempotencyKey } })
    if (cached && cached.expiresAt > new Date()) return cached.response
    const challenge = await this.prisma.challenge.findFirst({ where: { OR: [{ id: challengeSlug }, { slug: challengeSlug }], status: 'published' } })
    if (!challenge) throw new NotFoundException('挑战不存在')
    if (!challenge.questionBankId && !challenge.paperId) throw new BadRequestException('当前挑战尚未关联题库或试卷')
    const questions = challenge.paperId
      ? (await this.prisma.paperQuestion.findMany({
          where: { paperId: challenge.paperId, question: { status: 'published' } },
          orderBy: { sortOrder: 'asc' },
          include: { question: { include: { publishedVersion: true } } },
        })).map((item) => publishedQuestion(item.question))
      : (await this.prisma.question.findMany({ where: { bankId: challenge.questionBankId!, status: 'published' }, include: { publishedVersion: true } })).map(publishedQuestion)
    if (!questions.length) throw new BadRequestException('当前挑战尚未配置题目')
    const answers = new Map(input.answers.map((item) => [item.questionId, item.answer]))
    const correct = questions.filter((question) => JSON.stringify(answers.get(question.id)) === JSON.stringify(question.standardAnswer)).length
    const score = Math.round((correct / questions.length) * 100)
    const result = { challengeId: challenge.id, score, correct, total: questions.length, passed: score >= challenge.targetScore }
    return this.prisma.$transaction(async (tx) => {
      const attempt = await tx.assessmentAttempt.create({ data: { userId, challengeId: challenge.id, score, answers: input.answers as Prisma.InputJsonValue } })
      for (const question of questions) {
        const answer = answers.get(question.id) ?? null
        const isCorrect = JSON.stringify(answer) === JSON.stringify(question.standardAnswer)
        await tx.assessmentAnswer.create({
          data: { attemptId: attempt.id, userId, questionId: question.id, answer: answer as Prisma.InputJsonValue, correct: isCorrect },
        })
        if (isCorrect) {
          await tx.wrongQuestion.deleteMany({ where: { userId, questionId: question.id } })
        } else {
          await tx.wrongQuestion.upsert({
            where: { userId_questionId: { userId, questionId: question.id } },
            update: { attemptId: attempt.id, answer: answer as Prisma.InputJsonValue, resolvedAt: null },
            create: { userId, questionId: question.id, attemptId: attempt.id, answer: answer as Prisma.InputJsonValue },
          })
        }
        const stat = await tx.userKnowledgeStat.upsert({
          where: { userId_knowledgeKey: { userId, knowledgeKey: question.bankId } },
          update: { total: { increment: 1 }, correct: { increment: isCorrect ? 1 : 0 } },
          create: { userId, knowledgeKey: question.bankId, total: 1, correct: isCorrect ? 1 : 0, accuracy: isCorrect ? 100 : 0 },
        })
        await tx.userKnowledgeStat.update({
          where: { id: stat.id },
          data: { accuracy: Math.round((stat.correct / stat.total) * 100) },
        })
      }
      await tx.growthPoint.create({ data: { userId, eventType: 'assessment_submit', points: Math.max(10, Math.round(score / 2)), reference: challenge.id } })
      await tx.activityEvent.create({ data: { userId, eventType: 'assessment_submit', targetType: 'challenge', targetId: challenge.id, payload: { score } } })
      const attempts = await tx.assessmentAttempt.findMany({
        where: { challengeId: challenge.id },
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: [{ score: 'desc' }, { submittedAt: 'asc' }],
        take: 500,
      })
      const seen = new Set<string>()
      const rankings = attempts.filter((item) => {
        if (seen.has(item.userId)) return false
        seen.add(item.userId)
        return true
      }).slice(0, 100).map((item, index) => ({ rank: index + 1, userId: item.userId, displayName: item.user.displayName, score: item.score }))
      const periodStart = new Date()
      periodStart.setHours(0, 0, 0, 0)
      await tx.rankingSnapshot.create({
        data: { challengeId: challenge.id, periodStart, periodEnd: new Date(), rankings },
      })
      const achievement = await tx.achievement.findUnique({ where: { code: 'first-assessment' } })
      if (achievement?.enabled) {
        await tx.userAchievement.upsert({
          where: { userId_achievementId: { userId, achievementId: achievement.id } },
          update: {},
          create: { userId, achievementId: achievement.id, evidence: { attemptId: attempt.id } },
        })
      }
      if (result.passed) {
        const certificate = await tx.certificate.findUnique({ where: { code: 'ai-basics-pass' } })
        if (certificate?.enabled) {
          await tx.userCertificate.upsert({
            where: { userId_certificateId: { userId, certificateId: certificate.id } },
            update: { evidence: { attemptId: attempt.id, score } },
            create: { userId, certificateId: certificate.id, serialNo: `ALH-${randomUUID()}`, evidence: { attemptId: attempt.id, score } },
          })
        }
      }
      await tx.idempotencyKey.upsert({
        where: { key: idempotencyKey },
        update: { response: result, expiresAt: new Date(Date.now() + 86_400_000) },
        create: { key: idempotencyKey, scope: `assessment:${userId}`, response: result, expiresAt: new Date(Date.now() + 86_400_000) },
      })
      return result
    })
  }
}
