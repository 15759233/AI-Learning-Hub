<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { CommunityBindingInput, CommunityContentBlock, CommunityPostInput, CommunityPostType, CommunityTopicDto, LearningContentType } from '@ai-learning-hub/contracts'
import AppDialog from '../components/base/AppDialog.vue'
import { useCommunityStore } from '../stores/community'
import { communityApi } from '../services/api/community'
import { useCoursesStore } from '../stores/content/courses'
import { useLabsStore } from '../stores/content/labs'
import { useArticlesStore } from '../stores/content/articles'
import { useResourcesStore } from '../stores/content/resources'
import { useThemesStore } from '../stores/content/themes'
import { useChallengesStore } from '../stores/content/challenges'
import { postLabels } from './labels'
import CommunityBlocks from './CommunityBlocks.vue'
const store = useCommunityStore(), topics = ref<CommunityTopicDto[]>([])
const form = ref<CommunityPostInput>({ type: 'note', title: '', contentBlocks: [], bindings: [], topicIds: [], visibility: 'public', status: 'published' })
const body = ref(''), code = ref(''), language = ref('text'), quote = ref(''), images = ref<Array<{ fileId: string; alt: string }>>([])
const bindingType = ref<LearningContentType>('course'), bindingId = ref(''), preview = ref(false), saving = ref(false), error = ref('')
const bindingSearch = ref(''), bindingTitles = ref<Record<string, string>>({}), bindingLoading = ref(false)
const sources = { course: useCoursesStore(), lab: useLabsStore(), article: useArticlesStore(), resource: useResourcesStore(), theme: useThemesStore(), challenge: useChallengesStore() }
const source = computed(() => bindingType.value in sources ? sources[bindingType.value as keyof typeof sources] : null)
const bindingOptions = computed(() => source.value?.items.map((item) => ({ id: 'slug' in item ? String(item.slug) : item.id, title: item.title })) || [])
const loadOptions = async () => { bindingId.value = ''; if (!source.value) return; bindingLoading.value = true; try { await source.value.load({ page: 1, pageSize: 30, keyword: bindingSearch.value }) } catch (cause) { error.value = cause instanceof Error ? cause.message : '学习内容读取失败' } finally { bindingLoading.value = false } }
watch(bindingType, () => { bindingSearch.value = ''; if (store.composerOpen) void loadOptions() })
const blocks = computed<CommunityContentBlock[]>(() => [
  ...(body.value.trim() ? [{ type: 'paragraph' as const, text: body.value.trim() }] : []),
  ...(quote.value.trim() ? [{ type: 'quote' as const, text: quote.value.trim() }] : []),
  ...(code.value.trim() ? [{ type: 'code' as const, language: language.value, code: code.value }] : []),
  ...images.value.map((image) => ({ type: 'image' as const, ...image })),
])
watch(() => store.composerOpen, async (open) => {
  if (!open || !store.draft) return
  form.value = JSON.parse(JSON.stringify(store.draft)); preview.value = false; error.value = ''
  body.value = store.draft.contentBlocks.filter((b) => b.type === 'paragraph').map((b) => b.text).join('\n\n')
  code.value = store.draft.contentBlocks.filter((b) => b.type === 'code').map((b) => b.code).join('\n')
  language.value = store.draft.contentBlocks.find((b) => b.type === 'code')?.language || 'text'
  quote.value = store.draft.contentBlocks.filter((b) => b.type === 'quote').map((b) => b.text).join('\n')
  images.value = store.draft.contentBlocks.filter((b) => b.type === 'image').map((b) => ({ fileId: b.fileId, alt: b.alt || '' }))
  bindingTitles.value = {}
  try {
    topics.value = await communityApi.topics()
    await Promise.all(form.value.bindings.map(async (binding, index) => {
      const context = await communityApi.bindingContext(binding)
      bindingTitles.value[`${binding.type}:${binding.id}`] = context.binding.title
      if (!index && !form.value.topicIds.length) form.value.topicIds = context.topicIds
    }))
    await loadOptions()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '学习上下文加载失败' }
})
const addBinding = async () => {
  if (!bindingId.value.trim() || form.value.bindings.length >= 8) return
  const value: CommunityBindingInput = { type: bindingType.value, id: bindingId.value.trim() }
  try { const context = await communityApi.bindingContext(value); bindingTitles.value[`${value.type}:${value.id}`] = context.binding.title; if (!form.value.bindings.some((b) => b.type === value.type && b.id === value.id)) form.value.bindings.push(value); if (!form.value.topicIds.length) form.value.topicIds = context.topicIds; bindingId.value = '' }
  catch (cause) { error.value = cause instanceof Error ? cause.message : '关联内容不可用' }
}
const upload = async (event: Event) => {
  const input = event.target as HTMLInputElement
  if ((input.files?.length || 0) + images.value.length > 4) { error.value = '最多 4 张图片'; return }
  saving.value = true
  try { for (const file of Array.from(input.files || [])) { const row = await communityApi.upload(file); images.value.push({ fileId: row.id, alt: file.name }) } } catch (cause) { error.value = cause instanceof Error ? cause.message : '上传失败' } finally { saving.value = false; input.value = '' }
}
const save = async (draft = false) => {
  const epoch = store.epoch
  saving.value = true; error.value = ''
  try {
    const post = await communityApi.save({ ...form.value, contentBlocks: blocks.value, status: draft ? 'draft' : 'published' }, store.editingId)
    if (epoch !== store.epoch) return
    if (draft) store.composerOpen = false
    else store.published(post)
  } catch (cause) { error.value = cause instanceof Error ? cause.message : '发布失败' } finally { saving.value = false }
}
</script>
<template><div v-if="store.publishNotice" class="community-publish-feedback" role="status" aria-live="polite"><span>{{ store.publishNotice.text }}</span><RouterLink :to="`/community/post/${store.publishNotice.id}`">查看动态</RouterLink><button type="button" aria-label="关闭发布提示" @click="store.publishNotice = null">×</button></div><AppDialog v-model="store.composerOpen" :title="store.editingId ? '编辑学习内容' : '分享今天的学习收获'" class="community-composer">
  <form class="dialog-form composer-form" @submit.prevent="save()">
    <div class="composer-row"><label>内容类型<select v-model="form.type"><option v-for="(label, type) in postLabels" :key="type" :value="type as CommunityPostType">{{ label }}</option></select></label><label>可见范围<select v-model="form.visibility"><option value="public">登录社区用户</option><option value="school">仅同校用户</option></select></label></div>
    <label>标题{{ ['question', 'project'].includes(form.type) ? '（必填）' : '（选填）' }}<input v-model="form.title" maxlength="160" :required="['question', 'project'].includes(form.type)" placeholder="让同学更容易理解你的问题或收获" /></label>
    <template v-if="!preview"><label>正文<textarea v-model="body" rows="6" maxlength="15000" required placeholder="说明学习背景、尝试过的方法，以及你的发现……" /></label><details><summary>添加代码或引用</summary><label>代码语言<input v-model="language" maxlength="30" /></label><label>代码块（仅展示，不执行）<textarea v-model="code" rows="4" maxlength="12000" /></label><label>引用<textarea v-model="quote" rows="2" maxlength="2000" /></label></details><label>学习图片（最多 4 张，每张 5MB）<input type="file" multiple accept="image/png,image/jpeg,image/webp" :disabled="saving" @change="upload" /></label><div v-for="(image, index) in images" :key="image.fileId" class="composer-row"><input v-model="image.alt" aria-label="图片说明" maxlength="200" /><button class="text-link" type="button" @click="images.splice(index, 1)">移除</button></div></template>
    <CommunityBlocks v-else :blocks="blocks" />
    <fieldset><legend>关联学习内容</legend><p class="muted">选择已发布的学习内容。课时和本人实训记录可从原页面主动分享带入。</p><div class="composer-row"><select v-model="bindingType" aria-label="关联类型"><option v-for="(label, type) in { theme: '学习主题', course: '课程', lesson: '课时', lab: '实训', resource: '资源', article: '文章', challenge: '挑战', lab_run: '已提交实训记录' }" :key="type" :value="type">{{ label }}</option></select><template v-if="source"><input v-model="bindingSearch" placeholder="按标题查找" aria-label="查找关联学习内容" @keydown.enter.prevent="loadOptions" /><button class="button secondary small" type="button" :disabled="bindingLoading" @click="loadOptions">查找</button></template></div><div class="composer-row"><select v-if="source" v-model="bindingId" aria-label="关联学习内容" :disabled="bindingLoading"><option value="">{{ bindingLoading ? '读取中…' : '请选择学习内容' }}</option><option v-for="item in bindingOptions" :key="item.id" :value="item.id">{{ item.title }}</option></select><input v-else v-model="bindingId" placeholder="从本人学习记录取得的标识" aria-label="关联内容标识" /><button class="button secondary small" type="button" :disabled="!bindingId" @click="addBinding">关联</button></div><div class="community-topic-list"><button v-for="(binding, index) in form.bindings" :key="`${binding.type}:${binding.id}`" type="button" class="community-chip" @click="form.bindings.splice(index, 1)">{{ bindingTitles[`${binding.type}:${binding.id}`] || binding.id }} ×</button></div></fieldset>
    <fieldset><legend>学习话题（最多 5 项）</legend><div class="composer-topics"><label v-for="topic in topics" :key="topic.id"><input v-model="form.topicIds" type="checkbox" :value="topic.id" :disabled="form.topicIds.length >= 5 && !form.topicIds.includes(topic.id)" />{{ topic.name }}</label></div></fieldset>
    <p class="composer-privacy">仅发布你确认分享的内容；请勿包含私密笔记、完整成绩、实训日志或密钥。成就草稿不会自动公开。</p><p v-if="error" role="alert" class="community-error">{{ error }}</p>
    <div class="composer-actions"><button class="button secondary" type="button" @click="preview = !preview">{{ preview ? '继续编辑' : '发布预览' }}</button><button class="button secondary" type="button" :disabled="saving" @click="save(true)">保存草稿</button><button class="button primary" type="submit" :disabled="saving">{{ saving ? '正在保存…' : '确认发布' }}</button></div>
  </form>
</AppDialog></template>
