<script setup lang="ts">
import { HOMEPAGE_MODULE_KEYS, type PublicHomepageDto } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import AdminDialog from '../components/AdminDialog.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import AdminStatusTag from '../components/AdminStatusTag.vue'
import HomepagePreviewRenderer from '../components/HomepagePreviewRenderer.vue'
import { usePermissionAction } from '../composables/usePermissionAction'
import { api } from '../services/api'

interface HomepageModule {
  id: string; moduleKey: string; name: string; enabled: boolean; sortOrder: number; status: string;
  config: Record<string, unknown>; items: Array<{ id: string; targetType: string; targetId: string; titleOverride?: string; relationValid?: boolean }>
}
const modules = ref<HomepageModule[]>([])
const previewData = ref<PublicHomepageDto | null>(null)
const selected = ref<HomepageModule | null>(null)
const loading = ref(false)
const createOpen = ref(false)
const itemOpen = ref(false)
const canWrite = usePermissionAction('homepage.write')
const canPublish = usePermissionAction('homepage.publish')
const contentOptions = ref<Array<{ id: string; title: string; status: string }>>([])
const contentLoading = ref(false)
const createForm = reactive({ moduleKey: 'weekly_featured', moduleName: '', moduleType: 'content_grid' })
const itemForm = reactive({ targetType: 'course', targetId: '', titleOverride: '' })
const moduleOptions = HOMEPAGE_MODULE_KEYS
const kpis = computed(() => ({
  total: modules.value.length,
  enabled: modules.value.filter((item) => item.enabled).length,
  recommendations: modules.value.reduce((sum, item) => sum + item.items.length, 0),
  published: modules.value.filter((item) => item.status === 'published').length,
}))
const load = async () => {
  modules.value = await api('/admin/homepage/modules')
  previewData.value = await api<PublicHomepageDto>('/admin/homepage/preview')
  selected.value = modules.value.find((item) => item.id === selected.value?.id) || modules.value[0] || null
}
onMounted(load)
const save = async () => {
  if (!selected.value) return
  loading.value = true
  try {
    await api(`/admin/homepage/modules/${selected.value.id}`, { method: 'PATCH', body: JSON.stringify({ enabled: selected.value.enabled, sortOrder: selected.value.sortOrder, config: selected.value.config }) })
    await load()
    ElMessage.success('首页模块草稿已保存')
  } finally { loading.value = false }
}
const publish = async () => {
  await api('/admin/homepage/publish', { method: 'POST' })
  await load()
  ElMessage.success('首页已发布，学生端将读取最新模块')
}
const createModule = async () => {
  await api('/admin/homepage/modules', { method: 'POST', body: JSON.stringify({ ...createForm, config: {}, sortOrder: modules.value.length }) })
  createOpen.value = false
  Object.assign(createForm, { moduleKey: 'weekly_featured', moduleName: '', moduleType: 'content_grid' })
  await load()
  ElMessage.success('首页模块草稿已创建')
}
const move = async (index: number, offset: number) => {
  const next = index + offset
  if (next < 0 || next >= modules.value.length) return
  const reordered = [...modules.value]
  ;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
  modules.value = await api('/admin/homepage/modules/reorder', {
    method: 'PUT',
    body: JSON.stringify({ items: reordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) }),
  })
  selected.value = modules.value.find((item) => item.id === selected.value?.id) || null
}
const loadContentOptions = async () => {
  contentLoading.value = true
  itemForm.targetId = ''
  try {
    const plural: Record<string, string> = {
      theme: 'themes', course: 'courses', lab: 'labs',
      resource: 'resources', article: 'articles', challenge: 'challenges',
    }
    const page = await api<{ items: Array<{ id: string; title: string; status: string }> }>(`/admin/${plural[itemForm.targetType]}?page=1&pageSize=50`)
    contentOptions.value = page.items
  } finally {
    contentLoading.value = false
  }
}
watch(itemOpen, (open) => { if (open) void loadContentOptions() })
watch(() => itemForm.targetType, () => { if (itemOpen.value) void loadContentOptions() })
const addItem = async () => {
  if (!selected.value) return
  await api(`/admin/homepage/modules/${selected.value.id}/items`, { method: 'POST', body: JSON.stringify({ ...itemForm, sortOrder: selected.value.items.length }) })
  itemOpen.value = false
  Object.assign(itemForm, { targetType: 'course', targetId: '', titleOverride: '' })
  await load()
  ElMessage.success('推荐内容已加入模块草稿')
}
const moveItem = async (index: number, offset: number) => {
  if (!selected.value) return
  const next = index + offset
  if (next < 0 || next >= selected.value.items.length) return
  const reordered = [...selected.value.items]
  ;[reordered[index], reordered[next]] = [reordered[next], reordered[index]]
  const moduleId = selected.value.id
  modules.value = await api(`/admin/homepage/modules/${moduleId}/items/reorder`, {
    method: 'PUT',
    body: JSON.stringify({ items: reordered.map((item, sortOrder) => ({ id: item.id, sortOrder })) }),
  })
  selected.value = modules.value.find((item) => item.id === moduleId) || null
}
const removeItem = async (itemId: string) => {
  if (!selected.value) return
  await api(`/admin/homepage/modules/${selected.value.id}/items/${itemId}`, { method: 'DELETE' })
  await load()
  ElMessage.success('推荐内容已移除')
}
const preview = async () => {
  previewData.value = await api<PublicHomepageDto>('/admin/homepage/preview')
  ElMessage.success('预览已按当前服务端草稿刷新')
}
const archive = async () => {
  if (!selected.value) return
  selected.value.enabled = false
  await save()
  ElMessage.success('模块已下架，发布后学生端不再展示')
}
const saveAndPublish = async () => { await save(); await publish() }
</script>

<template>
  <AdminPageHeader title="首页运营" description="管理学生端首页模块内容、展示顺序与发布状态">
    <template #actions><button class="admin-secondary" type="button" :disabled="!canWrite" @click="save">保存草稿</button><button class="admin-primary" type="button" :disabled="!canPublish" @click="publish">发布更新</button></template>
  </AdminPageHeader>
  <div class="kpi-grid">
    <AdminKpiCard icon="▧" label="模块数量" :value="kpis.total" color="#ff4d1f" />
    <AdminKpiCard icon="▦" label="已启用模块" :value="kpis.enabled" color="#7c4dff" />
    <AdminKpiCard icon="↗" label="推荐内容" :value="kpis.recommendations" color="#22b66c" />
    <AdminKpiCard icon="⌁" label="已发布模块" :value="kpis.published" color="#3478f6" />
  </div>
  <section class="homepage-editor panel">
    <div class="module-list">
      <div class="panel-heading"><h2>首页模块管理</h2><button class="mini-add" type="button" :disabled="!canWrite" @click="createOpen = true">＋ 新增模块</button></div>
      <div v-for="(item, index) in modules" :key="item.id" :class="['module-row', { selected: selected?.id === item.id }]">
        <button type="button" @click="selected = item"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ item.name }}</strong><AdminStatusTag :status="item.status" /><small>排序 {{ item.sortOrder }}</small></button>
        <button type="button" :disabled="!canWrite || index === 0" aria-label="上移模块" @click="move(index, -1)">↑</button><button type="button" :disabled="!canWrite || index === modules.length - 1" aria-label="下移模块" @click="move(index, 1)">↓</button>
      </div>
      <p class="drag-hint">使用上下按钮调整模块排序，发布后同步学生端。</p>
    </div>
    <div class="homepage-preview">
      <div class="preview-title"><h2>首页草稿预览（桌面端）</h2><button class="text-link" type="button" @click="preview">刷新预览</button></div>
      <HomepagePreviewRenderer :homepage="previewData" />
    </div>
    <aside v-if="selected" class="module-settings">
      <div><h2>模块设置</h2><AdminStatusTag :status="selected.status" /></div>
      <fieldset class="domain-permission-scope" :disabled="!canWrite">
      <label>模块名称<input v-model="selected.name" disabled /></label>
      <label>模块标识<input v-model="selected.moduleKey" disabled /><small>系统内部标识，不可修改</small></label>
      <label>标题<input v-model="selected.config.title as string" placeholder="学生端展示标题" /></label>
      <label>副标题<textarea v-model="selected.config.subtitle as string" rows="3" placeholder="模块说明与价值表达" /></label>
      <section class="domain-section"><h3>推荐内容 <button class="text-link" type="button" @click="itemOpen = true">＋ 添加</button></h3><ul><li v-for="(item, index) in selected.items" :key="item.id">{{ item.targetType }} · {{ item.titleOverride || item.targetId }} · {{ item.relationValid === false ? '关联无效' : '关联有效' }} <button class="text-link" type="button" :disabled="index === 0" @click="moveItem(index, -1)">上移</button><button class="text-link" type="button" :disabled="index === selected.items.length - 1" @click="moveItem(index, 1)">下移</button><button class="text-link" type="button" @click="removeItem(item.id)">移除</button></li></ul><p v-if="!selected.items.length">暂无推荐内容。</p></section>
      <label>排序<input v-model.number="selected.sortOrder" type="number" min="0" /></label>
      <label class="toggle-row">模块启用<el-switch v-model="selected.enabled" /></label>
      <div class="module-action-row"><button class="admin-danger" type="button" @click="archive">下架</button><button class="admin-primary" type="button" :disabled="loading || !canPublish" @click="saveAndPublish">保存并发布</button></div>
      </fieldset>
      <button class="admin-secondary" type="button" @click="preview">预览该模块</button>
    </aside>
  </section>
  <AdminDialog v-model="createOpen" title="新增首页模块"><form class="admin-form" @submit.prevent="createModule"><label>模块类型<select v-model="createForm.moduleKey"><option v-for="key in moduleOptions" :key="key">{{ key }}</option></select></label><label>模块名称<input v-model="createForm.moduleName" required /></label><label>展示外壳<input v-model="createForm.moduleType" required /></label><button class="admin-primary" type="submit">创建模块草稿</button></form></AdminDialog>
  <AdminDialog v-model="itemOpen" title="添加模块推荐内容"><form class="admin-form" @submit.prevent="addItem"><label>内容类型<select v-model="itemForm.targetType"><option v-for="type in ['theme','course','lab','resource','article','challenge']" :key="type">{{ type }}</option></select></label><label>选择内容<select v-model="itemForm.targetId" required :disabled="contentLoading"><option value="">{{ contentLoading ? '正在加载…' : '请选择已存在内容' }}</option><option v-for="item in contentOptions" :key="item.id" :value="item.id">{{ item.title }} · {{ item.status }}</option></select></label><label>显示标题（可选）<input v-model="itemForm.titleOverride" /></label><button class="admin-primary" type="submit" :disabled="contentLoading || !itemForm.targetId">加入模块草稿</button></form></AdminDialog>
</template>
