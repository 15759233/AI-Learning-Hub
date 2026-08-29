import { Injectable, ServiceUnavailableException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'

interface WechatSessionResponse {
  openid?: string
  unionid?: string
  errcode?: number
}

@Injectable()
export class WechatMiniappService {
  constructor(private readonly config: ConfigService) {}

  async exchange(code: string) {
    const appId = this.config.get<string>('WECHAT_MINIAPP_APP_ID')
    const secret = this.config.get<string>('WECHAT_MINIAPP_SECRET')
    if (!appId || !secret) throw new ServiceUnavailableException('微信小程序认证未配置，当前仅开放安全适配边界')
    const query = new URLSearchParams({ appid: appId, secret, js_code: code, grant_type: 'authorization_code' })
    const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`)
    const body = await response.json() as WechatSessionResponse
    if (!response.ok || body.errcode || !body.openid) throw new ServiceUnavailableException('微信小程序认证暂不可用')
    return { providerUid: body.openid, unionid: body.unionid }
  }
}
