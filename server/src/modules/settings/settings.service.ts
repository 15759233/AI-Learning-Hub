import { BadRequestException, ConflictException, Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from '../../prisma/prisma.service'
import type { BatchSettingsDto, UpdateSettingDto } from './settings.dto'

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const settings = await this.prisma.systemSetting.findMany({ orderBy: { key: 'asc' } })
    return settings.map((item) => ({
      key: item.key,
      value: item.sensitive ? null : item.value,
      sensitive: item.sensitive,
      updatedAt: item.updatedAt,
    }))
  }

  private validate(input: UpdateSettingDto) {
    if (input.key === 'registration') throw new BadRequestException('注册设置请使用专用注册管理接口')
    const stringKeys = ['platform_name', 'platform_subtitle']
    const numberKeys = ['upload_max_mb', 'session_minutes']
    const arrayKeys = ['allowed_file_types', 'allowed_login_domains']
    if (stringKeys.includes(input.key) && typeof input.value !== 'string') throw new BadRequestException(`${input.key} 必须是字符串`)
    if (numberKeys.includes(input.key) && (typeof input.value !== 'number' || !Number.isFinite(input.value))) throw new BadRequestException(`${input.key} 必须是数字`)
    if (arrayKeys.includes(input.key) && (!Array.isArray(input.value) || input.value.some((item) => typeof item !== 'string'))) throw new BadRequestException(`${input.key} 必须是字符串数组`)
    if (input.key === 'notification_enabled' && typeof input.value !== 'boolean') throw new BadRequestException('notification_enabled 必须是布尔值')
  }

  update(input: UpdateSettingDto) {
    this.validate(input)
    return this.prisma.systemSetting.upsert({
      where: { key: input.key },
      update: { value: input.value as Prisma.InputJsonValue },
      create: { key: input.key, value: input.value as Prisma.InputJsonValue, sensitive: false },
    })
  }

  batch(input: BatchSettingsDto) {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.systemSetting.findUnique({ where: { key: 'settings_version' } })
      const currentVersion = Number(current?.value || 0)
      if (input.version !== currentVersion + 1) throw new ConflictException('设置版本已变化，请刷新后重试')
      for (const item of input.items) {
        this.validate(item)
        await tx.systemSetting.upsert({
          where: { key: item.key },
          update: { value: item.value as Prisma.InputJsonValue },
          create: { key: item.key, value: item.value as Prisma.InputJsonValue, sensitive: false },
        })
      }
      await tx.systemSetting.upsert({
        where: { key: 'settings_version' },
        update: { value: input.version },
        create: { key: 'settings_version', value: input.version, sensitive: false },
      })
      return { version: input.version, updated: input.items.length }
    })
  }
}
