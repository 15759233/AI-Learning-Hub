import { Module } from '@nestjs/common'
import { WechatMiniappService } from './wechat-miniapp.service'

@Module({ providers: [WechatMiniappService], exports: [WechatMiniappService] })
export class WechatModule {}
