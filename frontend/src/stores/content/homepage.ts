import type { PublicHomepageDto } from '@ai-learning-hub/contracts'
import { defineStore } from 'pinia'
import { ApiHomepageRepository, MockHomepageRepository } from '../../homepage/repositories'
import { dataMode } from '../../services/api/client'

export const useHomepageStore = defineStore('content-homepage', {
  state: () => ({ value: null as PublicHomepageDto | null, loading: false, error: '' }),
  actions: {
    async load() {
      this.loading = true
      this.error = ''
      try {
        this.value = await (dataMode === 'api' ? ApiHomepageRepository : MockHomepageRepository).load()
      }
      catch (error) { this.error = error instanceof Error ? error.message : '首页加载失败'; throw error }
      finally { this.loading = false }
    },
  },
})
