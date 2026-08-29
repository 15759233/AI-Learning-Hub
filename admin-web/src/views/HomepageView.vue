<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import AdminStatusTag from '../components/AdminStatusTag.vue'
import { api } from '../services/api'

interface HomepageModule {
  id: string; moduleKey: string; name: string; enabled: boolean; sortOrder: number; status: string;
  config: Record<string, unknown>; items: unknown[]
}
const modules = ref<HomepageModule[]>([])
const selected = ref<HomepageModule | null>(null)
const loading = ref(false)
const kpis = computed(() => ({
  total: modules.value.length,
  enabled: modules.value.filter((item) => item.enabled).length,
  recommendations: modules.value.reduce((sum, item) => sum + item.items.length, 0),
  published: modules.value.filter((item) => item.status === 'published').length,
}))
const load = async () => {
  modules.value = await api('/admin/homepage/modules')
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
</script>

<template>
  <AdminPageHeader title="首页运营" description="管理学生端首页模块内容、展示顺序与发布状态">
    <template #actions><button class="admin-secondary" type="button" @click="save">保存草稿</button><button class="admin-primary" type="button" @click="publish">发布更新</button></template>
  </AdminPageHeader>
  <div class="kpi-grid">
    <AdminKpiCard icon="▧" label="模块数量" :value="kpis.total" color="#ff4d1f" />
    <AdminKpiCard icon="▦" label="已启用模块" :value="kpis.enabled" color="#7c4dff" />
    <AdminKpiCard icon="↗" label="推荐内容" :value="kpis.recommendations" color="#22b66c" />
    <AdminKpiCard icon="⌁" label="已发布模块" :value="kpis.published" color="#3478f6" />
  </div>
  <section class="homepage-editor panel">
    <div class="module-list"><h2>首页模块管理</h2><button v-for="(item, index) in modules" :key="item.id" type="button" :class="{ selected: selected?.id === item.id }" @click="selected = item"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ item.name }}</strong><AdminStatusTag :status="item.status" /><small>排序 {{ item.sortOrder }}</small></button></div>
    <div class="homepage-preview"><h2>首页预览（桌面端）</h2><div><header><b>A</b><span>探索首页 · 学习主题 · 实训项目 · 资源中心 · AI 前沿</span></header><main><span class="preview-eyebrow">AI MAKER CAMPUS</span><h3>{{ String(selected?.config.title || selected?.name || '学生端首页模块') }}</h3><p>后台发布后由 `/api/v1/public/homepage` 驱动学生端组件注册表。</p><div class="preview-cards"><i v-for="n in 4" :key="n"></i></div></main></div></div>
    <aside v-if="selected" class="module-settings"><div><h2>模块设置</h2><AdminStatusTag :status="selected.status" /></div><label>模块名称<input v-model="selected.name" disabled /></label><label>模块标识<input v-model="selected.moduleKey" disabled /></label><label>展示标题<input v-model="selected.config.title as string" placeholder="学生端展示标题" /></label><label>排序<input v-model.number="selected.sortOrder" type="number" min="0" /></label><label class="toggle-row">模块启用<el-switch v-model="selected.enabled" /></label><button class="admin-primary" type="button" :disabled="loading" @click="save">保存当前模块</button></aside>
  </section>
</template>
