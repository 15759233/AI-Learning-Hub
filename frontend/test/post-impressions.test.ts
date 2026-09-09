// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import { createPinia, setActivePinia } from 'pinia'
import type { CommunityImpressionsDto, CommunityPostDetailDto } from '@ai-learning-hub/contracts'
import { communityApi } from '../src/services/api/community'
import { useCommunityStore } from '../src/stores/community'
import { communityScrollRoot } from '../src/community/composables/useCommunityScrollRoot'
import { confirmPostView, usePostImpression } from '../src/community/composables/usePostImpression'
import { mockCommunity, resetCommunityMock } from '../src/services/api/community.mock'

const auth = vi.hoisted(() => ({ user: { id: 'reader', communityWriteEnabled: false } }))
vi.mock('../src/stores/auth', () => ({ useAuthStore: () => auth }))
vi.mock('../src/media/catalog', () => ({ mockFixtureCover: () => ({ cover: '' }) }))
vi.mock('../src/services/api/community', () => ({ communityApi: { impressions: vi.fn(), viewContext: vi.fn(), reaction: vi.fn() } }))
let observers: FakeObserver[] = [], dispose: (() => void) | undefined
class FakeObserver {
  target?: Element
  options?: IntersectionObserverInit
  constructor(public callback: IntersectionObserverCallback, options?: IntersectionObserverInit) { this.options = options; observers.push(this) }
  observe(target: Element) { this.target = target }
  disconnect() { this.target = undefined }
  emit(ratio: number, intersecting = true) { this.callback([{ target: this.target!, isIntersecting: intersecting, intersectionRatio: ratio } as IntersectionObserverEntry], this as unknown as IntersectionObserver) }
}
const rect = (top: number, height: number, width = 300) => ({ top, bottom: top + height, left: 0, right: width, height, width, x: 0, y: top, toJSON: () => ({}) })
const fixture = () => mockCommunity<CommunityPostDetailDto>('/posts/community-note-1', 'GET')
const visibility = (value: 'visible' | 'hidden') => { Object.defineProperty(document, 'visibilityState', { configurable: true, value }); document.dispatchEvent(new Event('visibilitychange')) }
beforeEach(() => {
  vi.useFakeTimers(); vi.setSystemTime(new Date('2026-09-10T00:00:00Z')); vi.resetAllMocks(); resetCommunityMock()
  auth.user = { id: 'reader', communityWriteEnabled: false }; setActivePinia(createPinia()); observers = []
  vi.stubGlobal('IntersectionObserver', FakeObserver); vi.stubGlobal('innerWidth', 1200); vi.stubGlobal('innerHeight', 800)
  visibility('visible')
  vi.mocked(communityApi.viewContext).mockResolvedValue({ requestId: 'server-context', expiresAt: new Date(Date.now() + 3600000).toISOString() })
  vi.mocked(communityApi.impressions).mockImplementation(async (items) => ({ received: true, items: items.map((item) => ({ ...item, views: 7 })) }))
})
afterEach(() => { dispose?.(); dispose = undefined; vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals(); document.body.replaceChildren() })
async function mounted(input?: CommunityPostDetailDto) {
  const post = input || await fixture()
  const root = document.createElement('div'), host = document.createElement('div'); root.append(host); document.body.append(root)
  vi.spyOn(root, 'getBoundingClientRect').mockReturnValue(rect(100, 500, 400))
  let top = 200
  const app = createApp(defineComponent({ setup() {
    const target = ref<HTMLElement>(); usePostImpression(target, () => post, () => 'feed-context')
    return () => h('span', { ref: target })
  } }))
  app.use(createPinia()); app.provide(communityScrollRoot, ref(root)); app.mount(host); await nextTick()
  vi.spyOn(host.querySelector('span')!, 'getBoundingClientRect').mockImplementation(() => rect(top, 200))
  dispose = () => app.unmount()
  return { post, observer: [...observers].reverse().find((item) => item.target)!, position: (value: number) => { top = value } }
}
describe('实际可见浏览确认', () => {
  it('未进入、少于50%和快速经过不计数，真正可见满1秒才确认；只读用户可计数', async () => {
    const view = await mounted(); await vi.advanceTimersByTimeAsync(2000)
    expect(communityApi.impressions).not.toHaveBeenCalled()
    view.observer.emit(0.1); await vi.advanceTimersByTimeAsync(2000)
    view.position(550); view.observer.emit(0.8); await vi.advanceTimersByTimeAsync(2000)
    expect(communityApi.impressions).not.toHaveBeenCalled()
    view.position(200); view.observer.emit(1); await vi.advanceTimersByTimeAsync(700); view.observer.emit(0, false)
    await vi.advanceTimersByTimeAsync(1000); expect(communityApi.impressions).not.toHaveBeenCalled()
    view.observer.emit(1); await vi.advanceTimersByTimeAsync(999); expect(communityApi.impressions).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(51); expect(communityApi.impressions).toHaveBeenCalledOnce(); expect(view.post.stats.views).toBe(7)
    expect(view.observer.options?.rootMargin).toBe('0px 0px 0px 0px')
  })
  it('后台标签中断连续停留，回来后重新计满1秒', async () => {
    const view = await mounted(); view.observer.emit(1); await vi.advanceTimersByTimeAsync(600)
    visibility('hidden'); await vi.advanceTimersByTimeAsync(5000); expect(communityApi.impressions).not.toHaveBeenCalled()
    visibility('visible'); await vi.advanceTimersByTimeAsync(999); expect(communityApi.impressions).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(51); expect(communityApi.impressions).toHaveBeenCalledOnce()
  })
  it('图片模态框遮挡时不确认，关闭后重新计算连续可见时间', async () => {
    const view = await mounted(); view.observer.emit(1); await vi.advanceTimersByTimeAsync(600)
    const dialog = document.createElement('dialog'); dialog.open = true; document.body.append(dialog)
    document.dispatchEvent(new Event('focusin')); await vi.advanceTimersByTimeAsync(3000)
    expect(communityApi.impressions).not.toHaveBeenCalled()
    dialog.remove(); document.dispatchEvent(new Event('focusin')); await vi.advanceTimersByTimeAsync(1050)
    expect(communityApi.impressions).toHaveBeenCalledOnce()
  })
  it('失败可以重试，成功以后不再因相同观察回调确认；最多三次尝试', async () => {
    const view = await mounted(); vi.mocked(communityApi.impressions).mockRejectedValueOnce(new Error('断网'))
    view.observer.emit(1); await vi.advanceTimersByTimeAsync(1700)
    expect(communityApi.impressions).toHaveBeenCalledTimes(2); expect(view.post.stats.views).toBe(7)
    view.observer.emit(1); await vi.advanceTimersByTimeAsync(4000); expect(communityApi.impressions).toHaveBeenCalledTimes(2)
    dispose?.(); dispose = undefined; vi.clearAllTimers(); vi.mocked(communityApi.impressions).mockReset().mockRejectedValue(new Error('断网'))
    const other = await mounted({ ...await fixture(), id: 'other' }); other.observer.emit(1)
    await vi.advanceTimersByTimeAsync(10000); expect(communityApi.impressions).toHaveBeenCalledTimes(3)
  })
  it('私人草稿和待审核不计数，销毁未满一秒的卡片不补报', async () => {
    for (const status of ['draft', 'pending_review'] as const) {
      const view = await mounted({ ...await fixture(), status }); view.observer.emit(1); await vi.advanceTimersByTimeAsync(2000); dispose?.(); dispose = undefined
    }
    const view = await mounted(); view.observer.emit(1); await vi.advanceTimersByTimeAsync(500); dispose?.(); dispose = undefined
    await vi.advanceTimersByTimeAsync(2000); expect(communityApi.impressions).not.toHaveBeenCalled()
  })
  it('同一上下文合并批量且只在服务端确认后缓存，权威浏览量不被旧点赞响应覆盖', async () => {
    const store = useCommunityStore(), first = await fixture(), second = { ...await fixture(), id: 'second' }
    const pending = [confirmPostView(store, 'reader', first, undefined, 1000), confirmPostView(store, 'reader', second, undefined, 1000), confirmPostView(store, 'reader', first, undefined, 1000)]
    await vi.advanceTimersByTimeAsync(50); await Promise.all(pending)
    expect(communityApi.viewContext).toHaveBeenCalledOnce(); expect(communityApi.impressions).toHaveBeenCalledOnce()
    expect(vi.mocked(communityApi.impressions).mock.calls[0]![0]).toHaveLength(2)
    await confirmPostView(store, 'reader', first, undefined, 1000); expect(communityApi.impressions).toHaveBeenCalledOnce()
    vi.mocked(communityApi.reaction).mockResolvedValue({ active: true, stats: { likes: 8 } })
    await store.react(first, 'like'); expect(first.stats.views).toBe(7)
    vi.mocked(communityApi.reaction).mockResolvedValue({ active: true, stats: { bookmarks: 3, views: 2 } })
    await store.react(first, 'bookmark'); expect(first.stats.views).toBe(7)
  })
  it('账号切换时丢弃排队和迟到确认，不能把旧浏览归给新账号', async () => {
    const store = useCommunityStore(), post = await fixture()
    let finish!: (value: CommunityImpressionsDto) => void
    vi.mocked(communityApi.impressions).mockReturnValue(new Promise((resolve) => { finish = resolve }))
    const pending = confirmPostView(store, 'reader', post, 'context', 1000); await vi.advanceTimersByTimeAsync(50)
    auth.user = { id: 'other', communityWriteEnabled: false }; store.clear()
    finish({ received: true, items: [{ requestId: 'context', postId: post.id, views: 99 }] }); await pending
    expect(post.stats.views).toBe(0)
  })
})
