<script setup lang="ts">
import type { AdminResourceDetailDto, UpdateResourceInput } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref, watch } from 'vue'
import AdminKpiCard from '../../components/AdminKpiCard.vue'
import DomainPageShell from '../../components/DomainPageShell.vue'
import { useDraftEditor } from '../../composables/useDraftEditor'
import { usePagedList } from '../../composables/usePagedList'
import { usePermissionAction } from '../../composables/usePermissionAction'
import { usePublishAction } from '../../composables/usePublishAction'
import { api } from '../../services/api'

const list = usePagedList('resources')
const { result, keyword, status, dataOrigin, loading, error, selected } = list
const drafts = useDraftEditor('resources')
const publishing = usePublishAction('resources')
const canWrite = usePermissionAction('resource.write')
const canPublish = usePermissionAction('resource.publish')
const dialog = ref(false)
const detail = ref<AdminResourceDetailDto | null>(null)
const file = ref<File | null>(null)
const themeOptions = ref<Array<{ databaseId: string; title: string }>>([])
const courseOptions = ref<Array<{ databaseId: string; title: string }>>([])
const labOptions = ref<Array<{ databaseId: string; title: string }>>([])
const fields = reactive<{
  category: string
  format: string
  visibility: 'public' | 'authenticated' | 'private'
  difficulty: string
  tags: string
  downloadPermission: 'public' | 'authenticated' | 'restricted'
  themeId: string
  courseId: string
  labId: string
  fileId: string
}>({ category: '', format: '', visibility: 'public', difficulty: '', tags: '', downloadPermission: 'authenticated', themeId: '', courseId: '', labId: '', fileId: '' })
watch(list.selected, async (item) => {
  if (!item) return
  const loaded = await api<AdminResourceDetailDto>(`/admin/resources/${item.databaseId}`)
  detail.value = loaded
  Object.assign(fields, {
    category: loaded.category || '',
    format: loaded.format || '',
    visibility: loaded.visibility || 'public',
    difficulty: String(item.data.difficulty || ''),
    tags: Array.isArray(item.data.tags) ? item.data.tags.join(',') : '',
    downloadPermission: String(item.data.downloadPermission || 'authenticated'),
    themeId: String(item.data.themeId || ''),
    courseId: String(item.data.courseId || ''),
    labId: String(item.data.labId || ''),
    fileId: loaded.file?.id || '',
  })
})
onMounted(async () => {
  await list.load(1)
  const [themes, courses, labs] = await Promise.all([
    api<{ items: Array<{ databaseId: string; title: string }> }>('/admin/themes?page=1&pageSize=50'),
    api<{ items: Array<{ databaseId: string; title: string }> }>('/admin/courses?page=1&pageSize=50'),
    api<{ items: Array<{ databaseId: string; title: string }> }>('/admin/labs?page=1&pageSize=50'),
  ])
  themeOptions.value = themes.items
  courseOptions.value = courses.items
  labOptions.value = labs.items
})
const input = (): UpdateResourceInput => ({ ...fields, tags: fields.tags.split(',').map((item) => item.trim()).filter(Boolean) })
const create = async (value: { slug: string; title: string; summary: string; coverAssetId: string | null }) => { await drafts.createDraft({ ...value, category: '学习手册', format: 'PDF', visibility: 'authenticated' }); dialog.value = false; await list.load(1); ElMessage.success('资源草稿已创建') }
const save = async (base: { title: string; summary: string; sortOrder: number; coverAssetId?: string | null }) => {
  if (!list.selected.value) return
  await drafts.saveDraft(list.selected.value, { ...base, ...input() }); await list.load(); ElMessage.success('资源元数据已保存')
}
const uploadAndBind = async () => {
  if (!file.value || !list.selected.value) return
  const body = new FormData()
  body.set('file', file.value)
  body.set('visibility', fields.visibility)
  const uploaded = await api<{ id: string; originalName: string }>('/admin/files/upload', { method: 'POST', body })
  try {
    fields.fileId = uploaded.id
    fields.format ||= file.value.name.split('.').pop()?.toUpperCase() || ''
    await drafts.saveDraft(list.selected.value, { title: list.selected.value.title, summary: list.selected.value.summary, sortOrder: list.selected.value.sortOrder, ...input() })
  } catch (error) {
    fields.fileId = ''
    await api(`/admin/files/${uploaded.id}`, { method: 'DELETE' }).catch(() => undefined)
    throw error
  }
  detail.value = await api<AdminResourceDetailDto>(`/admin/resources/${list.selected.value.databaseId}`)
  file.value = null
  ElMessage.success('文件已上传并绑定到当前资源草稿')
}
const restoreVersion = async (versionId: string) => {
  if (!list.selected.value) return
  detail.value = await api<AdminResourceDetailDto>(`/admin/resources/${list.selected.value.databaseId}/versions/${versionId}/restore`, { method: 'POST' })
  await list.load(list.result.value.page)
  ElMessage.success('已从历史版本生成新的资源草稿版本')
}
const publish = async () => { if (list.selected.value) { await publishing.publish(list.selected.value); await list.load(); ElMessage.success('资源已发布') } }
const archive = async () => { if (list.selected.value) { await publishing.archive(list.selected.value); await list.load(); ElMessage.success('资源已下架') } }
</script>

<template>
  <DomainPageShell content-type="resource" :category-key="fields.category" :data-origin="dataOrigin" @update:data-origin="list.dataOrigin.value = $event" @remove="drafts.removeDraft(selected, () => list.load())" v-model:dialog="dialog" title="资源中心管理" description="维护资源文件、元数据、可见范围与关联内容" noun="资源" icon="resource" :result="result" :selected="selected" :keyword="keyword" :status="status" :loading="loading" :error="error" :can-write="canWrite" :can-publish="canPublish" @update:keyword="list.keyword.value = $event" @update:status="list.status.value = $event" @select="list.select" @page="list.load" @retry="list.load()" @create="create" @save="save" @publish="publish" @archive="archive">
    <template #kpis><div class="kpi-grid"><AdminKpiCard icon="resource" label="资源总数" :value="result.total" color="#ff4d1f" /><AdminKpiCard icon="check" label="已发布" :value="result.items.filter((item) => item.status === 'published').length" color="#22b66c" /><AdminKpiCard icon="download" label="当前下载" :value="detail?.downloads ?? '—'" color="#7c4dff" /><AdminKpiCard icon="chart" label="当前浏览" :value="detail?.views ?? '—'" color="#3478f6" /></div></template>
    <template #detail><p v-if="detail?.file">{{ detail.file.name }} · {{ (detail.file.size / 1024 / 1024).toFixed(2) }} MB · {{ detail.file.mimeType }} · 上传人 {{ detail.uploadedBy?.displayName || '—' }}</p><p v-else>尚未绑定文件。</p></template>
    <template #editor>
      <fieldset class="domain-permission-scope" :disabled="!canWrite">
      <section class="domain-section"><h3>资源元数据</h3><label>资源分类<select v-model="fields.category"><option v-for="name in ['学习手册','提示词模板','部署指南','Agent 案例','命令速查','硬件资料']" :key="name">{{ name }}</option></select></label><label>格式<input v-model="fields.format" /></label><label>难度<select v-model="fields.difficulty"><option value="">尚未配置</option><option>入门</option><option>中级</option><option>进阶</option></select></label><label>标签（逗号分隔）<input v-model="fields.tags" /></label><label>可见范围<select v-model="fields.visibility"><option>public</option><option>authenticated</option><option>private</option></select></label><label>下载权限<select v-model="fields.downloadPermission"><option>public</option><option>authenticated</option><option>restricted</option></select></label><label>关联主题<select v-model="fields.themeId"><option value="">不关联</option><option v-for="item in themeOptions" :key="item.databaseId" :value="item.databaseId">{{ item.title }}</option></select></label><label>关联课程<select v-model="fields.courseId"><option value="">不关联</option><option v-for="item in courseOptions" :key="item.databaseId" :value="item.databaseId">{{ item.title }}</option></select></label><label>关联实训<select v-model="fields.labId"><option value="">不关联</option><option v-for="item in labOptions" :key="item.databaseId" :value="item.databaseId">{{ item.title }}</option></select></label></section>
      <section class="domain-section"><h3>文件上传与绑定</h3><input type="file" @change="file = ($event.target as HTMLInputElement).files?.[0] || null" /><button class="admin-secondary" type="button" :disabled="!file || !canWrite" @click="uploadAndBind">上传并绑定当前草稿</button><p>文件上传与资源元数据分别记录，绑定成功后才进入发布版本。</p></section>
      <section class="domain-section"><h3>版本历史</h3><ul><li v-for="version in detail?.versions || []" :key="version.id">v{{ version.versionNo }} · {{ new Date(version.createdAt).toLocaleString('zh-CN') }} · {{ version.snapshot.title }} <button class="text-link" type="button" :disabled="!canWrite" @click="restoreVersion(version.id)">恢复为新草稿</button></li></ul><p v-if="!detail?.versions.length">暂无历史版本。</p></section>
      </fieldset>
    </template>
  </DomainPageShell>
</template>
