import { defineStore } from 'pinia'
import type { PublicPageVisualsDto } from '@ai-learning-hub/contracts'
import { dataMode, request } from '../../services/api/client'

export const usePageVisualsStore = defineStore('page-visuals', {
  state: () => ({ value: null as PublicPageVisualsDto | null, loading: false, loaded: false }),
  actions: {
    async load() {
      if (dataMode !== 'api' || this.loading || this.loaded) return
      this.loading = true
      try { this.value = await request<PublicPageVisualsDto>('/public/page-visuals'); this.loaded = true }
      catch { /* 头图配置不可用不阻断内容页，使用同manifest页面默认。 */ }
      finally { this.loading = false }
    },
  },
})
