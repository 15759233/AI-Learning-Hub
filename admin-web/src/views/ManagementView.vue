<script setup lang="ts">
import type { CatalogItemDto, PageResult } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import AdminDataList from '../components/AdminDataList.vue'
import AdminDetailPanel from '../components/AdminDetailPanel.vue'
import AdminDialog from '../components/AdminDialog.vue'
import AdminFilterBar from '../components/AdminFilterBar.vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import ManagementTools from '../components/ManagementTools.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import AdminPagination from '../components/AdminPagination.vue'
import { api } from '../services/api'

const route = useRoute()
const kind = computed(() => String(route.meta.kind))
const title = computed(() => String(route.meta.title))
const description = computed(() => String(route.meta.description))
const icon = computed(() => String(route.meta.icon || '◇'))
const noun = computed(() => ({ themes: '主题', courses: '课程', labs: '实训', resources: '资源', articles: '资讯', challenges: '挑战' }[kind.value] || '内容'))
const result = ref<PageResult<CatalogItemDto>>({ items: [], page: 1, pageSize: 10, total: 0 })
const selected = ref<CatalogItemDto | null>(null)
const keyword = ref(String(route.query.keyword || ''))
const status = ref('')
const loading = ref(false)
const error = ref('')
const dialog = ref(false)
const createForm = reactive({ slug: '', title: '', summary: '', category: '' })
const kpis = computed(() => ({
  total: result.value.total,
  published: result.value.items.filter((item) => item.status === 'published').length,
  draft: result.value.items.filter((item) => item.status === 'draft').length,
  recent: result.value.items.filter((item) => Date.now() - Date.parse(item.updatedAt) < 7 * 86_400_000).length,
}))
let debounce = 0
const load = async (page = result.value.page) => {
  loading.value = true
  error.value = ''
  try {
    const params = new URLSearchParams({ page: String(page), pageSize: '10' })
    if (keyword.value) params.set('keyword', keyword.value)
    if (status.value) params.set('status', status.value)
    result.value = await api(`/admin/${kind.value}?${params}`)
    selected.value = result.value.items.find((item) => item.id === selected.value?.id) || result.value.items[0] || null
  } catch (reason) {
    error.value = reason instanceof Error ? reason.message : '加载失败'
  } finally { loading.value = false }
}
watch([kind, keyword, status], () => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => void load(1), 260)
}, { immediate: false })
watch(kind, () => { selected.value = null; void load(1) })
onMounted(() => void load(1))
const create = async () => {
  loading.value = true
  try {
    const payload = createForm.category ? { category: createForm.category, ...(kind.value === 'labs' ? { labType: createForm.category } : {}) } : {}
    const item = await api<CatalogItemDto>(`/admin/${kind.value}`, { method: 'POST', body: JSON.stringify({ slug: createForm.slug, title: createForm.title, summary: createForm.summary, payload }) })
    dialog.value = false
    Object.assign(createForm, { slug: '', title: '', summary: '', category: '' })
    await load(1)
    selected.value = item
    ElMessage.success(`${noun.value}已创建为草稿`)
  } catch (reason) { ElMessage.error(reason instanceof Error ? reason.message : '创建失败') } finally { loading.value = false }
}
const save = async (value: { title: string; summary: string; sortOrder: number }) => {
  if (!selected.value) return
  try {
    selected.value = await api(`/admin/${kind.value}/${selected.value.databaseId || selected.value.id}`, { method: 'PATCH', body: JSON.stringify(value) })
    await load()
    ElMessage.success('草稿已保存')
  } catch (reason) { ElMessage.error(reason instanceof Error ? reason.message : '保存失败') }
}
const publish = async () => {
  if (!selected.value) return
  selected.value = await api(`/admin/${kind.value}/${selected.value.databaseId || selected.value.id}/publish`, { method: 'POST' })
  await load()
  ElMessage.success(`${noun.value}已发布，学生端 API 可读取`)
}
const archive = async () => {
  if (!selected.value) return
  selected.value = await api(`/admin/${kind.value}/${selected.value.databaseId || selected.value.id}/archive`, { method: 'POST' })
  await load()
  ElMessage.success(`${noun.value}已下架`)
}
const reset = () => { keyword.value = ''; status.value = '' }
</script>

<template>
  <AdminPageHeader :title="title" :description="description" :action="`新建${noun}`" @action="dialog = true" />
  <div class="kpi-grid">
    <AdminKpiCard :icon="icon" :label="`${noun}总数`" :value="kpis.total" color="#ff4d1f" change="8.2%" />
    <AdminKpiCard icon="✓" label="已发布" :value="kpis.published" color="#22b66c" change="6.8%" />
    <AdminKpiCard icon="◷" label="草稿" :value="kpis.draft" color="#f2a500" />
    <AdminKpiCard icon="▤" label="本周更新" :value="kpis.recent" color="#7c4dff" change="12.4%" />
  </div>
  <div v-if="error" class="error-banner">{{ error }}<button type="button" @click="load()">重试</button></div>
  <section class="management-panel panel">
    <div class="management-main">
      <AdminFilterBar v-model:keyword="keyword" v-model:status="status" :placeholder="`搜索${noun}名称或关键词`" @reset="reset" />
      <AdminDataList :items="result.items" :selected="selected?.id" :icon="icon" @select="selected = $event" />
      <AdminPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="load" />
    </div>
    <aside class="management-side">
      <AdminDetailPanel :item="selected" :busy="loading" :noun="noun" @save="save" @publish="publish" @archive="archive" />
      <ManagementTools :kind="kind" :item="selected" @updated="load()" />
    </aside>
  </section>
  <AdminDialog v-model="dialog" :title="`新建${noun}`">
    <form class="admin-form" @submit.prevent="create">
      <label>稳定标识<input v-model="createForm.slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" placeholder="例如：ai-course-2026" /></label>
      <label>{{ noun }}标题<input v-model="createForm.title" required maxlength="120" /></label>
      <label>摘要<textarea v-model="createForm.summary" required maxlength="500" rows="4" /></label>
      <label v-if="kind !== 'themes' && kind !== 'challenges'">分类<input v-model="createForm.category" placeholder="按学生端分类填写" /></label>
      <button class="admin-primary" type="submit" :disabled="loading">创建草稿</button>
    </form>
  </AdminDialog>
</template>
