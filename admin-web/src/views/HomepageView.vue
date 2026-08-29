<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { computed, onMounted, ref } from 'vue'
import heroCover from '../assets/hero-campus.webp'
import labCover from '../assets/lab-cover.webp'
import learningCover from '../assets/learning-cover.webp'
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
    <div class="module-list">
      <div class="panel-heading"><h2>首页模块管理</h2><button class="mini-add" type="button">＋ 新增模块</button></div>
      <button v-for="(item, index) in modules" :key="item.id" type="button" :class="{ selected: selected?.id === item.id }" @click="selected = item">
        <span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ item.name }}</strong><AdminStatusTag :status="item.status" /><small>排序 {{ item.sortOrder }} · ⋮</small>
      </button>
      <p class="drag-hint">拖拽可调整模块排序，发布后同步学生端。</p>
    </div>
    <div class="homepage-preview">
      <div class="preview-title"><h2>首页预览（桌面端）</h2><span>▣ / ▯</span></div>
      <div class="site-preview">
        <header><b>A</b><span>AI MAKER CAMPUS</span><nav>首页 · 学习主题 · 实训项目 · 资源中心 · AI 前沿</nav></header>
        <main>
          <section class="preview-hero">
            <div><span class="preview-eyebrow">AI MAKER CAMPUS</span><h3>{{ String(selected?.config.title || '学 AI，不止是听懂。还要亲手做出来。') }}</h3><p>从基础知识、项目案例，到模型应用与 AI Agent 助你成长。</p><button type="button">立即开始学习</button></div>
            <img :src="heroCover" alt="" />
          </section>
          <section class="preview-steps"><b>01<br><small>从零开始</small></b><b>02<br><small>结构化学习</small></b><b>03<br><small>真实实训</small></b><b>04<br><small>能力进阶</small></b></section>
          <section class="preview-row"><div><h4>本周值得投入时间的内容</h4><article v-for="n in 3" :key="n"><img :src="learningCover" alt="" /><span>大模型学习路径<br><small>系统课程 · {{ n + 5 }}.{{ n }}h</small></span></article></div></section>
          <section class="preview-labs"><h4>真正动手实训</h4><article v-for="n in 3" :key="n"><img :src="labCover" alt="" /><b>{{ ['模型部署', 'AI Agent', 'RAG 实战'][n - 1] }}</b></article></section>
          <section class="preview-footer-row"><span>🏆 本周 AI 能力挑战</span><span>📚 工具、模板和资料</span><span>✨ 用户学习成长记录</span></section>
        </main>
      </div>
    </div>
    <aside v-if="selected" class="module-settings">
      <div><h2>模块设置</h2><AdminStatusTag :status="selected.status" /></div>
      <label>模块名称<input v-model="selected.name" disabled /></label>
      <label>模块标识<input v-model="selected.moduleKey" disabled /><small>系统内部标识，不可修改</small></label>
      <label>标题<input v-model="selected.config.title as string" placeholder="学生端展示标题" /></label>
      <label>副标题<textarea v-model="selected.config.subtitle as string" rows="3" placeholder="模块说明与价值表达" /></label>
      <label>展示类型<span class="setting-options"><button class="active" type="button">图片轮播</button><button type="button">视频轮播</button></span></label>
      <div class="banner-strip"><img v-for="n in 4" :key="n" :src="[heroCover, learningCover, labCover, heroCover][n - 1]" alt="" /><button type="button">＋</button></div>
      <label>排序<input v-model.number="selected.sortOrder" type="number" min="0" /></label>
      <label class="toggle-row">模块启用<el-switch v-model="selected.enabled" /></label>
      <div class="module-action-row"><button class="admin-secondary" type="button">预览该模块</button><button class="admin-danger" type="button">下架</button><button class="admin-primary" type="button" :disabled="loading" @click="save">保存并发布</button></div>
    </aside>
  </section>
</template>
