import { communityApi } from '../services/api/community'

// 跨卡片最多四个图片请求；离开视图的排队项直接跳过，避免长信息流挤占网络。
let running = 0
const waiting: Array<() => void> = []
export const loadCommunityImage = (id: string, current: () => boolean) => new Promise<string | null>((resolve, reject) => {
  const run = () => {
    if (!current()) { resolve(null); waiting.shift()?.(); return }
    running++
    communityApi.image(id).then(resolve, reject).finally(() => { running--; waiting.shift()?.() })
  }
  if (running < 4) run()
  else waiting.push(run)
})
