import type { AdminDomainDtoMap, PageResult } from '@ai-learning-hub/contracts'
import { ref, shallowRef } from 'vue'
import { useRoute } from 'vue-router'
import { api } from '../services/api'
import { useDetailSelection } from './useDetailSelection'

export const usePagedList = <K extends keyof AdminDomainDtoMap>(kind: K) => {
  const route = useRoute()
  const result = shallowRef<PageResult<AdminDomainDtoMap[K]>>({ items: [], page: 1, pageSize: 10, total: 0 })
  const keyword = ref(String(route.query.keyword || ''))
  const status = ref('')
  const loading = ref(false)
  const error = ref('')
  const { selected, select } = useDetailSelection<AdminDomainDtoMap[K]>()

  const load = async (page = result.value.page) => {
    loading.value = true
    error.value = ''
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: String(result.value.pageSize) })
      if (keyword.value) query.set('keyword', keyword.value)
      if (status.value) query.set('status', status.value)
      result.value = await api(`/admin/${kind}?${query}`)
      select(result.value.items.find((item) => item.id === selected.value?.id) || result.value.items[0] || null)
    } catch (reason) {
      error.value = reason instanceof Error ? reason.message : '数据加载失败'
    } finally {
      loading.value = false
    }
  }

  return { result, keyword, status, loading, error, selected, select, load }
}
