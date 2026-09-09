import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import type { CommunityImpressionInput, CommunityPostSummaryDto, CommunityViewContextDto } from '@ai-learning-hub/contracts'
import { communityApi } from '../../services/api/community'
import { useCommunityStore } from '../../stores/community'
import { useAuthStore } from '../../stores/auth'
import { useCommunityScrollRoot } from './useCommunityScrollRoot'

type Store = ReturnType<typeof useCommunityStore>
interface Batch {
  owner: string
  context?: Promise<CommunityViewContextDto>
  expiresAt?: number
  confirmed: Map<string, number>
  pending: Map<string, { input: CommunityImpressionInput; resolve: Array<(views?: number) => void> }>
  timer?: ReturnType<typeof setTimeout>
}
const batches = new WeakMap<Store, Batch>()
const identity = (store: Store, userId?: string) => `${store.epoch}:${userId || ''}`
const keyOf = (item: { requestId: string; postId: string }) => `${item.requestId}:${item.postId}`

// 同一批可见帖子共用请求；请求失败不记成功，调用方最多重试两次。
export async function confirmPostView(store: Store, userId: string, post: CommunityPostSummaryDto, requestId: string | undefined, dwellMs: number, updateDwell = false) {
  const viewer = useAuthStore(), owner = identity(store, userId)
  const currentOwner = () => identity(store, viewer.user?.id)
  if (currentOwner() !== owner) return
  let batch = batches.get(store)
  if (!batch || batch.owner !== owner) {
    if (batch) { clearTimeout(batch.timer); for (const item of batch.pending.values()) item.resolve.forEach((resolve) => resolve()) }
    batch = { owner, confirmed: new Map(), pending: new Map() }; batches.set(store, batch)
  }
  const current = batch
  try {
    if (!requestId) {
      if (!current.context || (current.expiresAt && current.expiresAt <= Date.now())) {
        current.context = communityApi.viewContext().then((context) => { current.expiresAt = Date.parse(context.expiresAt); return context }).catch((error: unknown) => { current.context = undefined; throw error })
      }
      requestId = (await current.context).requestId
    }
    if (currentOwner() !== owner || batches.get(store) !== current) return
    const input = { requestId, postId: post.id, dwellMs: Math.min(120000, Math.floor(dwellMs)) }, key = keyOf(input)
    let views = updateDwell ? undefined : current.confirmed.get(key)
    if (views === undefined) views = await new Promise<number | undefined>((resolve) => {
      const pending = current.pending.get(key)
      if (pending) { pending.input.dwellMs = Math.max(pending.input.dwellMs || 0, input.dwellMs); pending.resolve.push(resolve) }
      else current.pending.set(key, { input, resolve: [resolve] })
      if (current.timer !== undefined) return
      current.timer = setTimeout(async () => {
        current.timer = undefined
        const items = [...current.pending.values()]; current.pending.clear()
        for (let offset = 0; offset < items.length; offset += 30) {
          const chunk = items.slice(offset, offset + 30)
          try {
            if (currentOwner() !== owner || batches.get(store) !== current) { chunk.forEach((row) => row.resolve.forEach((done) => done())); continue }
            const result = await communityApi.impressions(chunk.map((row) => row.input))
            const valid = currentOwner() === owner && batches.get(store) === current
            for (const row of chunk) {
              const confirmed = valid ? result.items.find((item) => keyOf(item) === keyOf(row.input)) : undefined
              if (confirmed) current.confirmed.set(keyOf(row.input), confirmed.views)
              row.resolve.forEach((done) => done(confirmed?.views))
            }
          } catch { chunk.forEach((row) => row.resolve.forEach((done) => done())) }
        }
      }, 50)
    })
    if (views !== undefined && currentOwner() === owner && batches.get(store) === current) {
      for (const copy of store.postCopies(post)) if (copy.id === post.id) copy.stats.views = Math.max(copy.stats.views || 0, views)
      return views
    }
  } catch { /* 有限重试由可见性计时器管理，不影响阅读。 */ }
}

/** 有界预览区域，避免长帖整卡永远达不到50%；不使用图片预加载边距。 */
export function visiblePostRatio(target: HTMLElement, root: HTMLElement | null) {
  if (document.visibilityState !== 'visible' || !target.isConnected || target.closest('[inert]')) return 0
  const modal = document.querySelector('dialog[open]')
  if (modal && !modal.contains(target)) return 0
  const box = target.getBoundingClientRect(), bounds = root?.getBoundingClientRect()
  const sticky = root?.querySelector<HTMLElement>('.community-feed-sticky')?.getBoundingClientRect()
  const top = Math.max(0, bounds?.top || 0, sticky && sticky.top <= (bounds?.top || 0) + 1 ? sticky.bottom : 0)
  const width = Math.max(0, Math.min(box.right, bounds?.right ?? innerWidth, innerWidth) - Math.max(box.left, bounds?.left || 0, 0))
  const height = Math.max(0, Math.min(box.bottom, bounds?.bottom ?? innerHeight, innerHeight) - Math.max(box.top, top))
  return box.width > 0 && box.height > 0 ? width * height / (box.width * box.height) : 0
}

export function usePostImpression(target: Ref<HTMLElement | undefined>, post: () => CommunityPostSummaryDto, requestId: () => string | undefined) {
  const store = useCommunityStore(), auth = useAuthStore(), root = useCommunityScrollRoot()
  let observer: IntersectionObserver | undefined, timer: ReturnType<typeof setTimeout> | undefined
  let since = 0, confirmed = false, attempts = 0, generation = 0, sending = false, owner = ''
  const eligible = () => !!auth.user?.id && post().status === 'published' && !!target.value && visiblePostRatio(target.value, root.value) >= 0.5
  const leave = (flush = true) => {
    clearTimeout(timer); timer = undefined
    if (flush && since && confirmed && auth.user?.id && owner === identity(store, auth.user.id)) void confirmPostView(store, auth.user.id, post(), requestId(), Date.now() - since, true)
    since = 0
  }
  const check = () => {
    if (!eligible()) { leave(); return }
    if (!since) since = Date.now()
    if (confirmed || sending || timer !== undefined || attempts >= 3) return
    timer = setTimeout(async () => {
      timer = undefined
      if (!eligible() || !since) { leave(); return }
      const ticket = generation
      sending = true; attempts++
      const result = await confirmPostView(store, auth.user!.id, post(), requestId(), Date.now() - since)
      if (ticket !== generation) return
      sending = false; confirmed = result !== undefined
      if (!confirmed && eligible() && attempts < 3) { timer = setTimeout(() => { timer = undefined; check() }, 500) }
    }, Math.max(0, 1000 - (Date.now() - since)))
  }
  const connect = () => {
    leave(false); generation++; confirmed = false; attempts = 0; sending = false; owner = identity(store, auth.user?.id); observer?.disconnect()
    if (!target.value || typeof IntersectionObserver === 'undefined') return
    const stickyHeight = root.value?.querySelector<HTMLElement>('.community-feed-sticky')?.getBoundingClientRect().height || 0
    observer = new IntersectionObserver((entries) => {
      for (const entry of entries) if (entry.target === target.value) {
        if (entry.isIntersecting && entry.intersectionRatio >= 0.5) check()
        else leave()
      }
    }, { root: root.value, threshold: [0, 0.5], rootMargin: `${-stickyHeight}px 0px 0px 0px` })
    observer.observe(target.value)
  }
  watch([target, root, () => post().id, () => post().status, requestId, () => auth.user?.id, () => store.epoch], connect, { flush: 'post' })
  onMounted(() => { if (typeof document !== 'undefined') { connect(); document.addEventListener('visibilitychange', check); document.addEventListener('focusin', check); window.addEventListener('resize', connect) } })
  onBeforeUnmount(() => { leave(); generation++; observer?.disconnect(); if (typeof document !== 'undefined') { document.removeEventListener('visibilitychange', check); document.removeEventListener('focusin', check); window.removeEventListener('resize', connect) } })
}
