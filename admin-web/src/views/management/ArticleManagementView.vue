<script setup lang="ts">
import type { AdminArticleDetailDto, UpdateArticleInput } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref, watch } from 'vue'
import AdminKpiCard from '../../components/AdminKpiCard.vue'
import DomainPageShell from '../../components/DomainPageShell.vue'
import { useDraftEditor } from '../../composables/useDraftEditor'
import { usePagedList } from '../../composables/usePagedList'
import { usePermissionAction } from '../../composables/usePermissionAction'
import { usePublishAction } from '../../composables/usePublishAction'
import { api } from '../../services/api'

const list = usePagedList('articles')
const { result, keyword, status, dataOrigin, loading, error, selected } = list
const drafts = useDraftEditor('articles')
const publishing = usePublishAction('articles')
const canWrite = usePermissionAction('article.write')
const canPublish = usePermissionAction('article.publish')
const dialog = ref(false)
const detail = ref<AdminArticleDetailDto | null>(null)
const fields = reactive({ category: '', tags: '', author: '', readMinutes: 0, blocks: '' })
const release = reactive({ scheduledAt: '', positionKey: 'frontier_hero' })
const positions = [
  ['frontier_hero', '前沿主推荐'],
  ['frontier_weekly', '本周推荐'],
  ['frontier_sidebar', '前沿侧栏'],
  ['homepage_news', '首页资讯'],
  ['channel_featured', '频道精选'],
]
watch(list.selected, async (item) => {
  if (!item) return
  const loaded = await api<AdminArticleDetailDto>(`/admin/articles/${item.databaseId}`)
  detail.value = loaded
  Object.assign(fields, {
    category: loaded.category || '',
    tags: Array.isArray(item.data.tags) ? item.data.tags.join(',') : '',
    author: String(item.data.author || ''),
    readMinutes: Number(item.data.readMinutes || 0),
    blocks: Array.isArray(item.data.blocks) ? item.data.blocks.map((block) => String((block as Record<string, unknown>).text || '')).join('\n\n') : '',
  })
  release.positionKey = loaded.recommendations[0]?.positionKey || 'frontier_hero'
})
onMounted(() => void list.load(1))
const input = (): UpdateArticleInput => ({ ...fields, tags: fields.tags.split(',').map((item) => item.trim()).filter(Boolean), blocks: fields.blocks.split('\n\n').filter(Boolean).map((text) => ({ type: 'paragraph', text })) })
const create = async (value: { slug: string; title: string; summary: string; coverAssetId: string | null }) => { await drafts.createDraft({ ...value, category: '大模型' }); dialog.value = false; await list.load(1); ElMessage.success('文章草稿已创建') }
const save = async (base: { title: string; summary: string; sortOrder: number; coverAssetId?: string | null }) => { if (list.selected.value) { await drafts.saveDraft(list.selected.value, { ...base, ...input() }); await list.load(); ElMessage.success('文章正文草稿已保存') } }
const saveRelease = async () => {
  if (!list.selected.value) return
  await api(`/admin/articles/${list.selected.value.databaseId}/recommendations`, { method: 'PUT', body: JSON.stringify({ items: [{ positionKey: release.positionKey, sortOrder: 0, enabled: true }] }) })
  if (release.scheduledAt) await api(`/admin/articles/${list.selected.value.databaseId}/schedule`, { method: 'POST', body: JSON.stringify({ scheduledAt: new Date(release.scheduledAt).toISOString() }) })
  detail.value = await api<AdminArticleDetailDto>(`/admin/articles/${list.selected.value.databaseId}`)
  ElMessage.success(release.scheduledAt ? '推荐位与定时发布已保存' : '推荐位已保存')
}
const publish = async () => { if (list.selected.value) { await publishing.publish(list.selected.value); await list.load(); ElMessage.success('文章已发布') } }
const archive = async () => { if (list.selected.value) { await publishing.archive(list.selected.value); await list.load(); ElMessage.success('文章已下架') } }
</script>

<template>
  <DomainPageShell content-type="article" :category-key="fields.category" :data-origin="dataOrigin" @update:data-origin="list.dataOrigin.value = $event" @remove="drafts.removeDraft(selected, () => list.load())" v-model:dialog="dialog" title="AI 前沿管理" description="维护文章正文、作者、推荐位与定时发布" noun="文章" icon="article" :result="result" :selected="selected" :keyword="keyword" :status="status" :loading="loading" :error="error" :can-write="canWrite" :can-publish="canPublish" @update:keyword="list.keyword.value = $event" @update:status="list.status.value = $event" @select="list.select" @page="list.load" @retry="list.load()" @create="create" @save="save" @publish="publish" @archive="archive">
    <template #kpis><div class="kpi-grid"><AdminKpiCard icon="article" label="文章总数" :value="result.total" color="#3478f6" /><AdminKpiCard icon="check" label="已发布" :value="result.items.filter((item) => item.status === 'published').length" color="#22b66c" /><AdminKpiCard icon="clock" label="待发布" :value="result.items.filter((item) => item.status === 'reviewing').length" color="#f2a500" /><AdminKpiCard icon="chart" label="当前阅读" :value="detail?.views ?? '—'" color="#7c4dff" /></div></template>
    <template #detail><p>{{ detail?.category || '尚未配置分类' }} · 推荐位 {{ detail?.recommendations.map((item) => item.positionKey).join('、') || '未配置' }}</p></template>
    <template #editor>
      <fieldset class="domain-permission-scope" :disabled="!canWrite">
      <section class="domain-section"><h3>文章内容</h3><label>分类<select v-model="fields.category"><option v-for="name in ['大模型','Agent','多模态','机器人','AI 安全']" :key="name">{{ name }}</option></select></label><label>标签（逗号分隔）<input v-model="fields.tags" /></label><label>作者<input v-model="fields.author" /></label><label>预计阅读分钟<input v-model.number="fields.readMinutes" type="number" min="0" /></label><label>正文段落（空行分段）<textarea v-model="fields.blocks" rows="8" /></label></section>
      <section class="domain-section"><h3>推荐与发布计划</h3><label>推荐位<select v-model="release.positionKey"><option v-for="[key, name] in positions" :key="key" :value="key">{{ name }}</option></select></label><label>定时发布时间<input v-model="release.scheduledAt" type="datetime-local" /></label><button class="admin-secondary" type="button" :disabled="!canWrite" @click="saveRelease">保存推荐与日程</button><p>公开 GET 只读取已发布内容；到期发布由服务端调度器处理。</p></section>
      </fieldset>
    </template>
  </DomainPageShell>
</template>
