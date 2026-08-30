import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick, reactive } from 'vue'
import { useCommunityDraft } from '../src/community/composables/useCommunityDraft'
import { useCommunityStore } from '../src/stores/community'
import { communityApi } from '../src/services/api/community'
import type { CommunityPostDetailDto } from '@ai-learning-hub/contracts'
import CommunityQuickComposer from '../src/community/CommunityQuickComposer.vue'
import { setupComponent } from '../src/community/test-renderer'

const account = reactive({ user: { id: 'owner-a' } as { id: string } | null, dataMode: 'mock' })
vi.mock('../src/stores/auth', () => ({ useAuthStore: () => account }))
vi.mock('../src/services/api/community', () => ({ communityApi: { topics: vi.fn(), save: vi.fn(), saveDraft: vi.fn(), upload: vi.fn(), bindingContext: vi.fn() } }))
const storage = new Map<string, string>()
const key = (id: string) => `community-draft:mock:${id}`
const settle = async () => { await nextTick(); await Promise.resolve(); await nextTick() }
const post = { id: 'saved-post', type: 'general', status: 'published', topics: [], viewerState: {} } as CommunityPostDetailDto
beforeEach(() => {
  vi.useFakeTimers(); vi.resetAllMocks(); storage.clear(); setActivePinia(createPinia())
  account.user = { id: 'owner-a' }
  vi.stubGlobal('localStorage', { getItem: (name: string) => storage.get(name) || null, setItem: (name: string, value: string) => storage.set(name, value), removeItem: (name: string) => storage.delete(name) })
  vi.stubGlobal('window', new EventTarget())
  vi.mocked(communityApi.topics).mockResolvedValue([])
  vi.mocked(communityApi.save).mockResolvedValue(post)
  vi.mocked(communityApi.saveDraft).mockResolvedValue({ id: 'server-draft' } as CommunityPostDetailDto)
})
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllGlobals() })
describe('共享发布器与草稿账号隔离', () => {
  it('首次空提交失败后补正文可以重试，Promise不被永久缓存', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle()
    expect(await editor.save()).toBe(false)
    expect(editor.error).toContain('正文')
    editor.body = '第二次填写的有效正文'; await settle()
    expect(await editor.save()).toBe(true)
    expect(communityApi.save).toHaveBeenCalledTimes(1)
    expect(vi.mocked(communityApi.save).mock.calls[0][0].contentBlocks).toEqual([{ type: 'paragraph', text: editor.body }])
  })
  it('快捷切高级共用正文、图片、关联与保存请求', async () => {
    const editor = useCommunityDraft(), store = useCommunityStore()
    store.openComposer(); await settle()
    editor.body = '切换编辑模式不丢内容'; editor.images = [{ fileId: 'image-a', alt: '学习图片' }]
    store.composerMode = 'advanced'; expect(useCommunityDraft()).toBe(editor)
    await editor.save()
    expect(communityApi.save).toHaveBeenCalledWith(expect.objectContaining({ contentBlocks: [{ type: 'paragraph', text: '切换编辑模式不丢内容' }, { type: 'image', fileId: 'image-a', alt: '学习图片' }] }), undefined)
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
    expect(communityApi.save).toHaveBeenLastCalledWith(expect.anything(), 'original-id')
  })
  it('侧栏首次打开和再次聚焦均定位可见的内联编辑区', async () => {
    const view = setupComponent<{ panel: HTMLElement }>(CommunityQuickComposer)
    const scroll = vi.fn(), focus = vi.fn()
    view.state.panel = { scrollIntoView: scroll, querySelector: () => ({ focus }) } as unknown as HTMLElement
    const store = useCommunityStore()
    store.openComposer(); store.composerInline = true; await settle()
    expect(scroll).toHaveBeenCalledOnce(); expect(focus).toHaveBeenCalledOnce()
    store.openComposer(); await settle()
    expect(scroll).toHaveBeenCalledTimes(2); expect(focus).toHaveBeenCalledTimes(2)
    view.unmount()
  })
})
