import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive, ref } from 'vue'
import { createMemoryHistory, createRouter, isNavigationFailure, NavigationFailureType, useLink } from 'vue-router'
import { useCommunityDraft } from '../src/community/composables/useCommunityDraft'
import { useCommunityStore } from '../src/stores/community'
import { communityApi } from '../src/services/api/community'
import type { CommunityPostDetailDto } from '@ai-learning-hub/contracts'
import CommunityQuickComposer from '../src/community/CommunityQuickComposer.vue'
import CommunityComposer from '../src/community/CommunityComposer.vue'
import { setupComponent } from '../src/community/test-renderer'
import { communityScrollRoot } from '../src/community/composables/useCommunityScrollRoot'
import { ApiError } from '../src/services/api/client'

const account = reactive({ user: { id: 'owner-a' } as { id: string } | null, dataMode: 'mock' })
vi.mock('../src/stores/auth', () => ({ useAuthStore: () => account }))
vi.mock('../src/services/api/community', () => ({ communityApi: { topics: vi.fn(), save: vi.fn(), saveDraft: vi.fn(), upload: vi.fn(), bindingContext: vi.fn(), post: vi.fn() } }))
const storage = new Map<string, string>()
const key = (id: string) => `community-draft:mock:${id}`
const settle = async () => { await nextTick(); await Promise.resolve(); await nextTick() }
const post = { id: 'saved-post', type: 'general', status: 'published', topics: [], viewerState: {} } as CommunityPostDetailDto
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); storage.clear(); setActivePinia(createPinia())
  account.user = { id: 'owner-a' }
  account.dataMode = 'mock'
  vi.stubGlobal('localStorage', { getItem: (name: string) => storage.get(name) || null, setItem: (name: string, value: string) => storage.set(name, value), removeItem: (name: string) => storage.delete(name) })
  vi.stubGlobal('window', new EventTarget())
  vi.mocked(communityApi.topics).mockResolvedValue([])
  vi.mocked(communityApi.save).mockResolvedValue(post)
  vi.mocked(communityApi.saveDraft).mockResolvedValue({ id: 'server-draft' } as CommunityPostDetailDto)
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('共享发布器与草稿账号隔离', () => {
  it.each([false, true])('创建响应丢失后修改正文，draft=%s先确认旧键再更新同一真实ID', async (asDraft) => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    const api = asDraft ? vi.mocked(communityApi.saveDraft) : vi.mocked(communityApi.save)
    api.mockRejectedValueOnce(new ApiError('server committed; response lost', 0))
    api.mockResolvedValue({ ...post, id: 'committed-one', revision: 1 })
    store.openComposer(); await settle(); editor.body = '第一版已在服务器提交'; await settle()
    expect(await editor.save(asDraft)).toBe(false)
    const firstKey = api.mock.calls[0][2]
    editor.body = '响应丢失后继续修改第二版'; await settle()
    expect(await editor.save(asDraft)).toBe(true)
    expect(api).toHaveBeenCalledTimes(3)
    expect(api.mock.calls[1][2]).toBe(firstKey)
    expect(api.mock.calls[1][0].contentBlocks).toEqual([{ type: 'paragraph', text: '第一版已在服务器提交' }])
    expect(api.mock.calls[2][1]).toBe('committed-one')
    expect(api.mock.calls[2][0]).toMatchObject({ expectedRevision: 1, contentBlocks: [{ type: 'paragraph', text: '响应丢失后继续修改第二版' }] })
    expect(api.mock.calls[2][2]).not.toBe(firstKey)
  })
  it.each([false, true])('延迟ACK期间继续输入，draft=%s不关闭编辑器且保留后续正文', async (asDraft) => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    const api = asDraft ? vi.mocked(communityApi.saveDraft) : vi.mocked(communityApi.save)
    let acknowledge!: (row: CommunityPostDetailDto) => void
    api.mockReturnValueOnce(new Promise((resolve) => { acknowledge = resolve }))
    store.openComposer(); await settle(); editor.body = '已提交版本'; await settle()
    const saving = editor.save(asDraft); await settle()
    editor.body = '等待确认时新增的正文'; await settle()
    acknowledge({ ...post, id: 'ack-one', revision: 1 })
    expect(await saving).toBe(false)
    expect(editor.body).toBe('等待确认时新增的正文'); expect(editor.dirty).toBe(true); expect(store.composerOpen).toBe(true)
    expect(asDraft ? editor.draftId : store.editingId).toBe('ack-one')
    expect(editor.form.expectedRevision).toBe(1)
    expect(storage.get(key('owner-a'))).toContain('等待确认时新增的正文')
    await editor.save(asDraft)
    expect(api.mock.calls[1][1]).toBe('ack-one')
  })
  it.each([false, true])('重放未ACK请求期间继续输入，draft=%s先确认再按同ID提交新正文', async (asDraft) => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    const api = asDraft ? vi.mocked(communityApi.saveDraft) : vi.mocked(communityApi.save)
    api.mockRejectedValueOnce(new ApiError('response lost', 0))
    store.openComposer(); await settle(); editor.body = '旧提交正文'; await settle()
    expect(await editor.save(asDraft)).toBe(false)
    let acknowledge!: (row: CommunityPostDetailDto) => void
    api.mockReturnValueOnce(new Promise((resolve) => { acknowledge = resolve }))
    const saving = editor.save(asDraft); await settle()
    editor.body = '重放等待期间的新正文'; await settle()
    acknowledge({ ...post, id: 'replayed-one', revision: 1 })
    expect(await saving).toBe(true)
    expect(api).toHaveBeenCalledTimes(3)
    expect(api.mock.calls[2][1]).toBe('replayed-one')
    expect(api.mock.calls[2][0].contentBlocks).toEqual([{ type: 'paragraph', text: '重放等待期间的新正文' }])
  })
  it.each(['post-b', 'post-a'])('同账号关闭再开%s，旧服务端读取不能跨编辑会话覆盖', async (target) => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '旧会话' }] }, 'post-a'); await settle()
    let resolve!: (post: CommunityPostDetailDto) => void
    vi.mocked(communityApi.post).mockReturnValueOnce(new Promise((done) => { resolve = done }))
    const reading = editor.readServer()
    editor.discard(); store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '新会话正在输入' }] }, target); await settle()
    resolve({ ...post, contentBlocks: [{ type: 'paragraph', text: '迟到旧版本' }], bindings: [], visibility: 'public' })
    await reading
    expect(editor.body).toBe('新会话正在输入'); expect(store.editingId).toBe(target)
  })
  it('存储拒绝不阻断真实保存，成功后的同文新发布使用新幂等键', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    vi.stubGlobal('localStorage', { getItem: () => null, setItem: () => { throw new Error('quota') }, removeItem: () => { throw new Error('storage disabled') } })
    store.openComposer(); await settle(); editor.body = '同文两次独立发布'; await settle()
    expect(await editor.save()).toBe(true)
    const first = vi.mocked(communityApi.save).mock.calls[0][2]
    store.openComposer(); await settle(); editor.body = '同文两次独立发布'; await settle()
    expect(await editor.save()).toBe(true)
    expect(vi.mocked(communityApi.save).mock.calls[1][2]).not.toBe(first)
    expect(editor.error).toBe('')
  })
  it('丢失响应保留幂等键重试，409保留输入并提供服务器版本恢复', async () => {
    account.dataMode = 'api'
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle(); editor.body = '不可丢失正文'; await settle()
    vi.mocked(communityApi.save).mockRejectedValueOnce(new ApiError('response lost', 0))
    expect(await editor.save()).toBe(false)
    const key = vi.mocked(communityApi.save).mock.calls[0][2]
    expect(editor.savedAt).toBe('尚未同步到服务器')
    expect(await editor.save()).toBe(true)
    expect(vi.mocked(communityApi.save).mock.calls[1][2]).toBe(key)
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '本机未覆盖内容' }], expectedRevision: 1 }, 'existing')
    await settle()
    vi.mocked(communityApi.save).mockRejectedValueOnce(new ApiError('版本冲突', 409))
    expect(await editor.save()).toBe(false); expect(editor.conflict).toBe(true); expect(editor.body).toBe('本机未覆盖内容')
    vi.mocked(communityApi.post).mockResolvedValue({ ...post, revision: 2, contentBlocks: [{ type: 'paragraph', text: '服务器版本' }], bindings: [], topics: [], visibility: 'public' })
    await editor.readServer(); expect(editor.body).toBe('服务器版本'); expect(editor.form.expectedRevision).toBe(2); expect(editor.conflict).toBe(false)
  })
  it('服务端版本迟到响应在切号后不得写入新账号恢复快照', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: 'A私有草稿' }], status: 'draft' }, 'private-a')
    await settle()
    let resolve!: (post: CommunityPostDetailDto) => void
    vi.mocked(communityApi.post).mockReturnValue(new Promise((done) => { resolve = done }))
    const reading = editor.readServer()
    store.clear(); account.user = { id: 'owner-b' }; await settle()
    resolve({ ...post, contentBlocks: [{ type: 'paragraph', text: 'A私有服务器版本' }], bindings: [], visibility: 'public' })
    await reading
    expect(editor.body).toBe(''); expect(editor.savedAt).toBe(''); expect(storage.has(key('owner-b'))).toBe(false)
  })
  it('首次空提交失败后补正文可以重试，Promise不被永久缓存', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle()
    expect(await editor.save()).toBe(false)
    expect(editor.error).toContain('正文')
    editor.body = '第二次填写的有效正文'; await settle()
    expect(await editor.save()).toBe(true)
    expect(communityApi.save).toHaveBeenCalledTimes(1)
    expect(vi.mocked(communityApi.save).mock.calls[0][0].contentBlocks).toEqual([{ type: 'paragraph', text: '第二次填写的有效正文' }])
    expect(editor.body).toBe(''); expect(store.composerOpen).toBe(false)
  })
  it('快捷切高级共用正文、图片、关联与保存请求', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle()
    editor.body = '切换编辑模式不丢内容'; editor.images = [{ fileId: 'image-a', alt: '学习图片' }]
    store.composerMode = 'advanced'; expect(useCommunityDraft()).toBe(editor)
    await editor.save()
    expect(communityApi.save).toHaveBeenCalledWith(expect.objectContaining({ contentBlocks: [{ type: 'paragraph', text: '切换编辑模式不丢内容' }, { type: 'image', fileId: 'image-a', alt: '学习图片' }] }), undefined, expect.any(String))
  })
  it('切号取消待保存定时器，保留前账号已保存稿且不写后账号', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle(); editor.body = '已保存给A'; await settle()
    await vi.advanceTimersByTimeAsync(2001)
    const saved = storage.get(key('owner-a'))
    expect(saved).toContain('已保存给A')
    editor.body = '尚未落盘的A内容'; await settle()
    store.clear(); account.user = { id: 'owner-b' }; await settle()
    await vi.advanceTimersByTimeAsync(11000)
    expect(storage.get(key('owner-a'))).toBe(saved)
    expect(storage.has(key('owner-b'))).toBe(false); expect(storage.has(key('anonymous'))).toBe(false)
    expect(editor.body).toBe(''); expect(communityApi.saveDraft).not.toHaveBeenCalled()
  })
  it('迟到上传和关联响应不能注入另一账号', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    let uploadDone!: (row: { id: string }) => void, bindingDone!: (row: Awaited<ReturnType<typeof communityApi.bindingContext>>) => void
    vi.mocked(communityApi.upload).mockReturnValue(new Promise((resolve) => { uploadDone = resolve }))
    vi.mocked(communityApi.bindingContext).mockReturnValue(new Promise((resolve) => { bindingDone = resolve }))
    store.openComposer(); await settle()
    editor.bindingId = 'course-a'
    const binding = editor.addBinding(), upload = editor.uploadFiles([new File(['test'], 'one.png', { type: 'image/png' })])
    store.clear(); account.user = { id: 'owner-b' }; await settle()
    bindingDone({ binding: { title: '前账号课程' }, topicIds: ['old-topic'] } as Awaited<ReturnType<typeof communityApi.bindingContext>>); uploadDone({ id: 'old-image' })
    await Promise.all([binding, upload])
    expect(editor.images).toEqual([]); expect(editor.form.bindings).toEqual([]); expect(editor.form.topicIds).toEqual([])
  })
  it('迟到保存不得清除后账号内容、草稿或保存状态', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    let oldDone!: (row: CommunityPostDetailDto) => void
    vi.mocked(communityApi.saveDraft).mockReturnValueOnce(new Promise((resolve) => { oldDone = resolve }))
    store.openComposer(); await settle(); editor.body = '账号A'; await settle()
    const oldSave = editor.save(true); await settle()
    store.clear(); account.user = { id: 'owner-b' }; store.openComposer(); await settle()
    editor.body = '账号B'; await settle()
    expect(await editor.save(true)).toBe(true)
    oldDone({ id: 'draft-a' } as CommunityPostDetailDto)
    expect(await oldSave).toBe(false)
    expect(editor.body).toBe('账号B'); expect(editor.draftId).toBe('server-draft')
    expect(storage.get(key('owner-b'))).toContain('账号B')
  })
  it('已打开A时打开B会明确拦截，关闭后正文和目标一起切换', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore(), notice = vi.fn()
    window.addEventListener('api-error', notice)
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '正文A' }] }, 'post-a'); await settle()
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '正文B' }] }, 'post-b'); await settle()
    expect(store.editingId).toBe('post-a'); expect(editor.body).toBe('正文A'); expect(notice).toHaveBeenCalled()
    editor.discard()
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '正文B' }] }, 'post-b'); await settle()
    expect(store.editingId).toBe('post-b'); expect(editor.body).toBe('正文B')
  })
  it('已发布内容的本地编辑稿恢复时保留编辑目标，不新建重复帖子', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer({ contentBlocks: [{ type: 'paragraph', text: '旧正文' }] }, 'original-id'); await settle()
    editor.body = '恢复后应编辑原帖'; await settle(); await editor.save(true)
    store.composerOpen = false; store.editingId = undefined
    store.openComposer(); await settle()
    expect(store.editingId).toBe('original-id'); expect(editor.body).toBe('恢复后应编辑原帖')
    await editor.save()
    expect(communityApi.save).toHaveBeenLastCalledWith(expect.anything(), 'original-id', expect.any(String))
  })
  it('侧栏首次打开和再次聚焦不滚动可见编辑区，完全离开视口才移动中栏', async () => {
    const scroll = vi.fn(), focus = vi.fn()
    const root = ref({ scrollTop: 300, scrollTo: scroll, getBoundingClientRect: () => ({ top: 0, bottom: 600 }) })
    const view = setupComponent<{ panel: HTMLElement }>(CommunityQuickComposer, {}, undefined, [[communityScrollRoot, root]])
    let bounds = { top: 150, bottom: 450 }
    view.state.panel = { getBoundingClientRect: () => bounds, querySelector: () => ({ focus }) } as unknown as HTMLElement
    const store = useCommunityStore()
    store.openComposer(); store.composerInline = true; await settle()
    expect(scroll).not.toHaveBeenCalled(); expect(focus).toHaveBeenCalledOnce()
    store.openComposer(); await settle()
    expect(scroll).not.toHaveBeenCalled(); expect(focus).toHaveBeenCalledTimes(2)
    bounds = { top: -500, bottom: -100 }
    store.openComposer(); await settle()
    expect(scroll).toHaveBeenCalledWith({ top: -320, behavior: 'smooth' }); expect(focus).toHaveBeenCalledTimes(3)
    view.unmount()
  })
  it('普通快捷打开不读取话题或学习目录，切换类型保留正文且空稿不写服务端', async () => {
    const view = setupComponent<{ open: (type: 'note' | 'question') => void }>(CommunityQuickComposer)
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); store.composerInline = true; await settle()
    expect(communityApi.topics).not.toHaveBeenCalled(); expect(communityApi.bindingContext).not.toHaveBeenCalled()
    view.state.open('question'); await settle(); await vi.advanceTimersByTimeAsync(15000)
    expect(communityApi.saveDraft).not.toHaveBeenCalled()
    editor.body = '类型切换保留的正文'; await settle(); view.state.open('note'); await settle()
    expect(editor.body).toBe('类型切换保留的正文'); expect(editor.form.type).toBe('note')
    await vi.advanceTimersByTimeAsync(2000)
    expect(editor.savedAt).toBe('本地演示草稿已保存'); expect(communityApi.saveDraft).not.toHaveBeenCalled()
    await editor.loadTopics(); expect(communityApi.topics).toHaveBeenCalledOnce()
    view.unmount()
  })
  it('清空已暂存文字不会恢复旧正文，也不额外创建空服务端草稿', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle(); editor.body = '待清空的本地正文'; await settle()
    await vi.advanceTimersByTimeAsync(2000); expect(storage.get(key('owner-a'))).toContain('待清空')
    editor.body = ''; await settle(); await editor.saveAndClose()
    expect(communityApi.saveDraft).not.toHaveBeenCalled(); expect(storage.has(key('owner-a'))).toBe(false)
    store.openComposer(); await settle(); expect(editor.body).toBe('')
  })
})

describe('发布器到草稿箱的真实路由生命周期', () => {
  const views: Array<{ unmount: () => void }> = []
  afterEach(() => { for (const view of views.splice(0).reverse()) view.unmount() })
  const setupNavigation = async (initial = '/community', mode: 'quick' | 'advanced' = 'quick') => {
    const pinia = createPinia(), router = createRouter({ history: createMemoryHistory(), routes: ['/community', '/community/drafts', '/welcome'].map((path) => ({ path, component: { render: () => null } })) })
    setActivePinia(pinia)
    await router.push(initial)
    const composer = setupComponent<{ finish: (save: boolean) => Promise<void>; cancel: () => void }>(CommunityComposer, {}, [pinia, router])
    const link = setupComponent<{ navigate: (event: MouseEvent) => Promise<unknown> }>({ setup: () => useLink({ to: '/community/drafts' }) }, {}, [pinia, router])
    views.push(composer, link)
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); store.composerMode = mode; store.composerInline = false
    await settle()
    const clickDrafts = () => link.state.navigate(new Event('click', { cancelable: true }) as MouseEvent)
    return { router, editor, store, composer: composer.state, clickDrafts }
  }
  it.each(['quick', 'advanced'] as const)('%s 已保存草稿点击链接后到达草稿箱并关闭全局面板', async (mode) => {
    const { router, editor, store, clickDrafts } = await setupNavigation('/community', mode)
    editor.body = '保留同一条草稿'; await settle(); expect(await editor.save(true)).toBe(true)
    await clickDrafts(); await settle()
    expect(router.currentRoute.value.path).toBe('/community/drafts')
    expect(store.composerOpen).toBe(false); expect(editor.closePrompt).toBe(false)
    expect(editor.draftId).toBe('server-draft'); expect(storage.get(key('owner-a'))).toContain('保留同一条草稿')
    expect(communityApi.saveDraft).toHaveBeenCalledTimes(1)
  })
  it('未保存选择继续编辑取消导航，后续关闭也不会恢复被取消的跳转', async () => {
    const { router, editor, store, composer, clickDrafts } = await setupNavigation()
    editor.body = '取消后仍在原稿'; await settle()
    expect(isNavigationFailure(await clickDrafts(), NavigationFailureType.aborted)).toBe(true)
    expect(editor.closePrompt).toBe(true); composer.cancel(); await settle()
    expect(router.currentRoute.value.path).toBe('/community'); expect(store.composerOpen).toBe(true)
    expect(editor.body).toBe('取消后仍在原稿'); expect(editor.dirty).toBe(true)
    expect(communityApi.saveDraft).not.toHaveBeenCalled()
    editor.close(); await composer.finish(true); await settle()
    expect(router.currentRoute.value.path).toBe('/community'); expect(store.composerOpen).toBe(false)
  })
  it.each([true, false])('未保存选择保存=%s后才允许导航并关闭，保存失败不丢稿', async (save) => {
    const { router, editor, store, composer, clickDrafts } = await setupNavigation()
    editor.body = '三选决定之前保留内容'; await settle(); await clickDrafts()
    expect(router.currentRoute.value.path).toBe('/community'); expect(store.composerOpen).toBe(true)
    if (save) {
      vi.mocked(communityApi.saveDraft).mockRejectedValueOnce(new Error('隔离保存失败'))
      await composer.finish(true); await settle()
      expect(router.currentRoute.value.path).toBe('/community'); expect(store.composerOpen).toBe(true)
      expect(editor.closePrompt).toBe(true); expect(editor.body).toBe('三选决定之前保留内容')
    }
    await composer.finish(save)
    for (let i = 0; i < 10; i++) await settle()
    expect(router.currentRoute.value.path).toBe('/community/drafts'); expect(store.composerOpen).toBe(false)
    expect(editor.closePrompt).toBe(false)
    expect(storage.has(key('owner-a'))).toBe(save)
  })
  it('已在草稿箱的重复导航仍关闭已保存稿，未保存稿则确认后再关闭', async () => {
    const { router, editor, store, composer, clickDrafts } = await setupNavigation('/community/drafts')
    editor.body = '同路由已保存稿'; await settle(); await editor.save(true)
    expect(isNavigationFailure(await clickDrafts(), NavigationFailureType.duplicated)).toBe(true)
    expect(store.composerOpen).toBe(false); expect(editor.draftId).toBe('server-draft')
    store.openComposer(); await settle(); editor.body = '同路由尚未保存的修改'; await settle()
    await clickDrafts(); expect(editor.closePrompt).toBe(true); expect(store.composerOpen).toBe(true)
    composer.cancel(); expect(editor.body).toBe('同路由尚未保存的修改')
    expect(router.currentRoute.value.path).toBe('/community/drafts'); expect(store.composerOpen).toBe(true)
    await clickDrafts(); await composer.finish(true); await settle()
    expect(store.composerOpen).toBe(false); expect(router.currentRoute.value.path).toBe('/community/drafts')
    expect(editor.draftId).toBe('server-draft')
    expect(communityApi.saveDraft).toHaveBeenLastCalledWith(expect.anything(), 'server-draft', expect.any(String))
  })
  it('其他守卫取消目标导航时保留已保存的全局编辑面板', async () => {
    const { router, editor, store, clickDrafts } = await setupNavigation()
    editor.body = '其他守卫取消也不关闭'; await settle(); await editor.save(true)
    const remove = router.beforeEach(() => false)
    expect(isNavigationFailure(await clickDrafts(), NavigationFailureType.aborted)).toBe(true)
    expect(router.currentRoute.value.path).toBe('/community'); expect(store.composerOpen).toBe(true)
    expect(editor.body).toBe('其他守卫取消也不关闭'); expect(editor.closePrompt).toBe(false)
    remove()
  })
})
