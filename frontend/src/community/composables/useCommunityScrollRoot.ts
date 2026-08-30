import { inject, nextTick, onBeforeUnmount, onMounted, provide, ref, watch, type InjectionKey, type Ref } from 'vue'
import { useRoute } from 'vue-router'

export const communityScrollRoot: InjectionKey<Ref<HTMLElement | null>> = Symbol('communityScrollRoot')
export const useCommunityScrollRoot = () => inject(communityScrollRoot, ref<HTMLElement | null>(null))

// 页面级位置与信息流缓存分开：信息流的模式、类型和游标由社区 store 管理。
export const provideCommunityScrollRoot = () => {
  const root = ref<HTMLElement | null>(null), route = useRoute()
  const positions = new Map<string, number>()
  provide(communityScrollRoot, root)
  let currentPath = route.fullPath
  const remember = () => {
    positions.delete(currentPath)
    positions.set(currentPath, root.value?.scrollTop || 0)
    if (positions.size > 40) positions.delete(positions.keys().next().value!)
  }
  const stop = watch(() => route.fullPath, async (path) => {
    remember()
    currentPath = path
    await nextTick()
    if (route.path !== '/community' && root.value) root.value.scrollTop = positions.get(path) || 0
  }, { flush: 'pre' })
  onMounted(() => {
    document.documentElement.classList.add('community-layout-active')
    document.body.classList.add('community-layout-active')
  })
  onBeforeUnmount(() => {
    stop()
    positions.clear()
    document.documentElement.classList.remove('community-layout-active')
    document.body.classList.remove('community-layout-active')
  })
  return root
}
