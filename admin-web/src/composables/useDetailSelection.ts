import { shallowRef } from 'vue'

export const useDetailSelection = <T extends { id: string }>() => {
  const selected = shallowRef<T | null>(null)
  const select = (item: T | null) => { selected.value = item }
  return { selected, select }
}
