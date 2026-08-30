import { computed, onScopeDispose, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type { CommunityBindingInput, CommunityContentBlock, CommunityDraftDto, CommunityPostInput, CommunityTopicDto, LearningContentType } from '@ai-learning-hub/contracts'
import { useCommunityStore } from '../../stores/community'
import { useAuthStore } from '../../stores/auth'
import { communityApi } from '../../services/api/community'
import { useCoursesStore } from '../../stores/content/courses'
import { useLabsStore } from '../../stores/content/labs'
import { useArticlesStore } from '../../stores/content/articles'
import { useResourcesStore } from '../../stores/content/resources'
import { useThemesStore } from '../../stores/content/themes'
import { useChallengesStore } from '../../stores/content/challenges'
export const useCommunityDraft = defineStore('community-draft', () => {
  const store = useCommunityStore(), auth = useAuthStore()
  const form = ref<CommunityPostInput>({ type: 'general', title: '', contentBlocks: [], bindings: [], topicIds: [], visibility: 'public', status: 'published' })
  const body = ref(''), code = ref(''), language = ref('text'), quote = ref(''), images = ref<Array<{ fileId: string; alt: string }>>([])
  const topics = ref<CommunityTopicDto[]>([]), bindingType = ref<LearningContentType>('course'), bindingId = ref(''), bindingSearch = ref(''), bindingTitles = ref<Record<string, string>>({})
  const preview = ref(false), saving = ref(false), bindingLoading = ref(false), topicsLoading = ref(false), error = ref(''), savedAt = ref(''), closePrompt = ref(false), dirty = ref(false), draftId = ref<string>()
  const sources = { course: useCoursesStore(), lab: useLabsStore(), article: useArticlesStore(), resource: useResourcesStore(), theme: useThemesStore(), challenge: useChallengesStore() }
  const source = computed(() => bindingType.value in sources ? sources[bindingType.value as keyof typeof sources] : null)
  const bindingOptions = computed(() => source.value?.items.map((item) => ({ id: 'slug' in item ? String(item.slug) : item.id, title: item.title })) || [])
  const advanced = computed(() => store.composerMode === 'advanced')
  const blocks = computed<CommunityContentBlock[]>(() => [...(body.value.trim() ? [{ type: 'paragraph' as const, text: body.value.trim() }] : []), ...(quote.value.trim() ? [{ type: 'quote' as const, text: quote.value.trim() }] : []), ...(code.value.trim() ? [{ type: 'code' as const, language: language.value, code: code.value }] : []), ...images.value.map((image) => ({ type: 'image' as const, ...image }))])
  const input = () => ({ ...form.value, contentBlocks: blocks.value })
  const hasContent = () => !!(blocks.value.length || form.value.title?.trim() || form.value.bindings.length || form.value.topicIds.length)
  const key = () => `community-draft:${auth.dataMode}:${auth.user?.id || 'anonymous'}`
  let timer: ReturnType<typeof setTimeout> | undefined, remoteTimer: ReturnType<typeof setTimeout> | undefined, hydrating = false
  let pending: Promise<boolean> | null = null
  const loadOptions = async () => { bindingId.value = ''; if (!source.value) return; const owner = auth.user?.id, epoch = store.epoch; bindingLoading.value = true; try { await source.value.load({ page: 1, pageSize: 30, keyword: bindingSearch.value }) } catch (cause) { if (owner === auth.user?.id && epoch === store.epoch) error.value = cause instanceof Error ? cause.message : '学习内容读取失败' } finally { if (owner === auth.user?.id && epoch === store.epoch) bindingLoading.value = false } }
  const loadTopics = async () => {
    if (topicsLoading.value || topics.value.length) return
    const owner = auth.user?.id, epoch = store.epoch
    topicsLoading.value = true
    try { const rows = await communityApi.topics(); if (owner === auth.user?.id && epoch === store.epoch) topics.value = rows }
    catch (cause) { if (owner === auth.user?.id && epoch === store.epoch) error.value = cause instanceof Error ? cause.message : '话题读取失败' }
    finally { if (owner === auth.user?.id && epoch === store.epoch) topicsLoading.value = false }
  }
  const hydrate = (value: CommunityPostInput) => {
    hydrating = true
    form.value = JSON.parse(JSON.stringify(value)); preview.value = false; error.value = ''; savedAt.value = ''; dirty.value = false
    body.value = value.contentBlocks.filter((b) => b.type === 'paragraph').map((b) => b.text).join('\n\n')
    code.value = value.contentBlocks.filter((b) => b.type === 'code').map((b) => b.code).join('\n')
    quote.value = value.contentBlocks.filter((b) => b.type === 'quote').map((b) => b.text).join('\n')
    language.value = value.contentBlocks.find((b) => b.type === 'code')?.language || 'text'
    images.value = value.contentBlocks.filter((b) => b.type === 'image').map((b) => ({ fileId: b.fileId, alt: b.alt || '' }))
    queueMicrotask(() => { hydrating = false })
  }
  const restore = (row: CommunityDraftDto) => { store.openComposer(row.input, row.id) }
  watch(() => store.composerOpen, async (open) => {
    if (!open || !store.draft) { clearTimeout(timer); clearTimeout(remoteTimer); return }
    const epoch = store.epoch, owner = auth.user?.id
    draftId.value = store.draft.status === 'draft' ? store.editingId : undefined
    let value = store.draft
    if (!store.editingId && !value.contentBlocks.length && !value.bindings.length) {
      try { const local = JSON.parse(localStorage.getItem(key()) || 'null') as (CommunityDraftDto & { editingId?: string }) | null; if (local?.input) { value = local.input; draftId.value = local.id || undefined; store.editingId = local.editingId; if (local.editingId) { store.composerMode = 'advanced'; store.composerInline = false }; savedAt.value = '已恢复本地草稿' } } catch { error.value = '本地草稿格式异常，可从草稿箱恢复' }
    }
    hydrate(value)
    try {
      for (const binding of value.bindings) { const context = await communityApi.bindingContext(binding); if (epoch !== store.epoch || owner !== auth.user?.id) return; bindingTitles.value[`${binding.type}:${binding.id}`] = context.binding.title; if (!form.value.topicIds.length) form.value.topicIds = context.topicIds }
    } catch (cause) { if (epoch === store.epoch && owner === auth.user?.id) error.value = cause instanceof Error ? cause.message : '学习上下文读取失败' }
  }, { flush: 'sync' })
  watch(bindingType, () => { bindingSearch.value = ''; bindingId.value = '' })
  const addBinding = async () => {
    if (!bindingId.value.trim() || form.value.bindings.length >= (advanced.value ? 8 : 1)) return
    const value: CommunityBindingInput = { type: bindingType.value, id: bindingId.value.trim() }
    const owner = auth.user?.id, epoch = store.epoch
    try { const context = await communityApi.bindingContext(value); if (owner !== auth.user?.id || epoch !== store.epoch) return; bindingTitles.value[`${value.type}:${value.id}`] = context.binding.title; if (!form.value.bindings.some((b) => b.type === value.type && b.id === value.id)) form.value.bindings.push(value); if (!form.value.topicIds.length) form.value.topicIds = context.topicIds; bindingId.value = '' }
    catch (cause) { if (owner === auth.user?.id && epoch === store.epoch) error.value = cause instanceof Error ? cause.message : '关联内容不可用' }
  }
  const uploadFiles = async (files: File[]) => {
    const epoch = store.epoch, owner = auth.user?.id
    if (saving.value) { error.value = '正在保存或上传，请完成后再添加图片'; return }
    if (files.length + images.value.length > 4) { error.value = '最多 4 张图片'; return }
    saving.value = true
    try { for (const file of files) { const row = await communityApi.upload(file); if (epoch !== store.epoch || owner !== auth.user?.id) return; images.value.push({ fileId: row.id, alt: file.name }) } } catch (cause) { if (epoch === store.epoch && owner === auth.user?.id) error.value = cause instanceof Error ? cause.message : '上传失败' } finally { if (epoch === store.epoch && owner === auth.user?.id) saving.value = false }
  }
  const upload = async (event: Event) => { const target = event.target as HTMLInputElement; await uploadFiles(Array.from(target.files || [])); target.value = '' }
  const localSave = () => { localStorage.setItem(key(), JSON.stringify({ id: draftId.value || '', editingId: store.editingId, input: input(), updatedAt: new Date().toISOString() })); savedAt.value = '已保存' }
  const save = (asDraft = false): Promise<boolean> => {
    if (pending) return pending
    if (saving.value) return Promise.resolve(false)
    const epoch = store.epoch, owner = auth.user?.id
    const operation = Promise.resolve().then(async () => {
      if (owner !== auth.user?.id || epoch !== store.epoch) return false
      saving.value = true; error.value = ''
      try {
        if (!asDraft && !blocks.value.length) throw new Error('请填写正文')
        if (!asDraft && ['question', 'project'].includes(form.value.type) && !form.value.title?.trim()) throw new Error('问题和项目需要标题')
        if (!asDraft && !advanced.value && (form.value.bindings.length > 1 || form.value.topicIds.length > 3)) throw new Error('此草稿包含更多关联或话题，请切换高级编辑')
        if (asDraft && !hasContent() && !draftId.value && !store.editingId) { localStorage.removeItem(key()); dirty.value = false; savedAt.value = ''; return true }
        if (asDraft && store.editingId && !draftId.value) { localSave(); return true }
        const captured = JSON.stringify(input())
        const post = asDraft ? await communityApi.saveDraft(input(), draftId.value) : await communityApi.save({ ...input(), status: 'published' }, store.editingId || draftId.value)
        if (epoch !== store.epoch || owner !== auth.user?.id) return false
        if (asDraft) { draftId.value = post.id; localSave(); savedAt.value = auth.dataMode === 'api' ? '草稿已同步到服务器' : '本地演示草稿已保存'; dirty.value = captured !== JSON.stringify(input()) }
        else { clearTimeout(timer); clearTimeout(remoteTimer); localStorage.removeItem(key()); dirty.value = false; draftId.value = undefined; store.published(post); hydrate({ type: 'general', title: '', contentBlocks: [], bindings: [], topicIds: [], visibility: 'public', status: 'published' }) }
        return true
      } catch (cause) { if (epoch === store.epoch && owner === auth.user?.id) error.value = cause instanceof Error ? cause.message : '保存失败'; return false }
      finally { if (epoch === store.epoch && owner === auth.user?.id) saving.value = false; if (pending === operation) pending = null }
    })
    pending = operation
    return pending
  }
  watch([form, body, code, quote, language, images], () => {
    if (hydrating || !store.composerOpen) return
    dirty.value = dirty.value || hasContent() || !!draftId.value || !!store.editingId; clearTimeout(timer); clearTimeout(remoteTimer)
    if (!dirty.value) return
    const owner = auth.user?.id, epoch = store.epoch
    const current = () => !!owner && owner === auth.user?.id && epoch === store.epoch
    timer = setTimeout(() => { if (!current()) return; try { localSave() } catch { error.value = '浏览器存储空间不足，请保存服务端草稿' } }, 2000)
    remoteTimer = setTimeout(() => { if (current() && store.composerOpen && dirty.value) void save(true) }, 10000)
  }, { deep: true })
  watch([() => auth.user?.id, () => store.epoch], () => {
    clearTimeout(timer); clearTimeout(remoteTimer); hydrating = true
    body.value = ''; code.value = ''; quote.value = ''; images.value = []; topics.value = []; bindingTitles.value = {}; bindingLoading.value = false; topicsLoading.value = false; draftId.value = undefined; dirty.value = false; saving.value = false; error.value = ''; closePrompt.value = false; pending = null
    form.value = { type: 'general', title: '', contentBlocks: [], bindings: [], topicIds: [], visibility: 'public', status: 'published' }
    queueMicrotask(() => { hydrating = false })
  }, { flush: 'sync' })
  const close = () => { if (saving.value) { error.value = '正在保存或上传，请稍后再关闭'; return }; if (dirty.value) closePrompt.value = true; else store.composerOpen = false }
  const discard = () => { if (saving.value) return; clearTimeout(timer); clearTimeout(remoteTimer); localStorage.removeItem(key()); dirty.value = false; closePrompt.value = false; store.composerOpen = false }
  const saveAndClose = async () => { if (await save(true)) { closePrompt.value = false; store.composerOpen = false } }
  onScopeDispose(() => { clearTimeout(timer); clearTimeout(remoteTimer) })
  return { form, body, code, language, quote, images, topics, bindingType, bindingId, bindingSearch, bindingTitles, bindingOptions, source, preview, saving, bindingLoading, topicsLoading, error, savedAt, closePrompt, dirty, draftId, blocks, advanced, loadTopics, loadOptions, addBinding, upload, uploadFiles, save, restore, close, discard, saveAndClose }
})
