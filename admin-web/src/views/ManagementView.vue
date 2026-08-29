<script setup lang="ts">
import type { CatalogItemDto, PageResult } from '@ai-learning-hub/contracts'
import { ElMessage } from 'element-plus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import heroCover from '../assets/hero-campus.webp'
import labCover from '../assets/lab-cover.webp'
import learningCover from '../assets/learning-cover.webp'
import AdminDialog from '../components/AdminDialog.vue'
import AdminFilterBar from '../components/AdminFilterBar.vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import AdminPagination from '../components/AdminPagination.vue'
import AdminStatusTag from '../components/AdminStatusTag.vue'
import ManagementTools from '../components/ManagementTools.vue'
import { api } from '../services/api'

const route = useRoute()
const kind = computed(() => String(route.meta.kind))
const title = computed(() => String(route.meta.title))
const description = computed(() => String(route.meta.description))
const noun = computed(() => ({ themes: '主题', courses: '课程', labs: '实训', resources: '资源', articles: '资讯', challenges: '挑战' }[kind.value] || '内容'))
const result = ref<PageResult<CatalogItemDto>>({ items: [], page: 1, pageSize: 10, total: 0 })
const selected = ref<CatalogItemDto | null>(null)
const keyword = ref(String(route.query.keyword || ''))
const status = ref('')
const loading = ref(false)
const error = ref('')
const dialog = ref(false)
const createForm = reactive({ slug: '', title: '', summary: '', category: '' })
const editForm = reactive({ title: '', summary: '', sortOrder: 0 })
const covers = [learningCover, labCover, heroCover]
const recentCount = computed(() => result.value.items.filter((item) => Date.now() - Date.parse(item.updatedAt) < 7 * 86_400_000).length)
const pageConfig = computed(() => ({
  themes: {
    icon: '▤', tabs: ['主题列表', '学习路径'], labels: ['主题总数', '学习路径数', '本周推荐主题', '平均完成率'],
    values: [result.value.total, result.value.items.reduce((sum, item) => sum + Number(item.payload?.pathCount || 1), 0), Math.min(2, result.value.total), '42.6%'],
    colors: ['#ff4d1f', '#20b568', '#7c4dff', '#3478f6'],
  },
  courses: {
    icon: '▣', tabs: ['课程列表', '章节模板', '内容组件'], labels: ['课程总数', '草稿课程', '已发布课程', '本周更新'],
    values: [result.value.total, result.value.items.filter((item) => item.status === 'draft').length, result.value.items.filter((item) => item.status === 'published').length, recentCount.value],
    colors: ['#ff4d1f', '#f2a500', '#20b568', '#7c4dff'],
  },
  labs: {
    icon: '⬡', tabs: ['实训项目', '实训路径'], labels: ['实训总数', '已发布', '进行中', '平均完成率'],
    values: [result.value.total, result.value.items.filter((item) => item.status === 'published').length, Math.min(9, result.value.total), '68.4%'],
    colors: ['#3478f6', '#20b568', '#ff7a35', '#7c4dff'],
  },
  resources: {
    icon: '▱', tabs: ['学习手册', '提示词模板', '部署指南', 'Agent 案例', '命令速查', '硬件资料'], labels: ['资源总数', '本周上传', '待审核', '下载量（总）'],
    values: [result.value.total, recentCount.value, result.value.items.filter((item) => item.status === 'reviewing').length, '128.6K'],
    colors: ['#ff4d1f', '#20b568', '#f2a500', '#7c4dff'],
  },
  articles: {
    icon: '◉', tabs: ['全部', '大模型', 'Agent', '多模态', '机器人', 'AI 安全'], labels: ['资讯总数', '本周发布', '待发布', '本周热度'],
    values: [result.value.total, recentCount.value, result.value.items.filter((item) => item.status === 'draft').length, '28.6K'],
    colors: ['#3478f6', '#7c4dff', '#3478f6', '#ff6a32'],
  },
  challenges: {
    icon: '▦', tabs: ['挑战活动', '模拟测评', '题库', '排行展示'], labels: ['挑战总数', '题库数量', '本周参与', '平均正确率'],
    values: [result.value.total, Math.max(1, result.value.total), '5,268', '78.6%'],
    colors: ['#ff4d1f', '#3478f6', '#7c4dff', '#20b568'],
  },
}[kind.value] || { icon: '◇', tabs: [], labels: [], values: [], colors: [] }))
const itemCover = (item: CatalogItemDto, index = 0) => covers[(index + item.slug.length) % covers.length]
const category = (item: CatalogItemDto) => String(item.payload?.category || item.payload?.labType || ({
  themes: 'AI 学习',
  courses: '大模型',
  labs: '部署与服务',
  resources: '学习手册',
  articles: '大模型',
  challenges: '挑战赛',
}[kind.value] || '平台内容'))
const metric = (item: CatalogItemDto, key: string, fallback: string | number) => item.payload?.[key] ?? fallback
const compactMetric = (value: number) => `${Math.max(0, value).toFixed(1)}K`
const activeTab = ref(0)
let debounce = 0

watch(selected, () => {
  editForm.title = selected.value?.title || ''
  editForm.summary = selected.value?.summary || ''
  editForm.sortOrder = selected.value?.sortOrder || 0
})
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
  } finally {
    loading.value = false
  }
}
watch([keyword, status], () => {
  window.clearTimeout(debounce)
  debounce = window.setTimeout(() => void load(1), 260)
})
watch(kind, () => {
  selected.value = null
  activeTab.value = 0
  void load(1)
})
onMounted(() => void load(1))

const create = async () => {
  loading.value = true
  try {
    const payload = createForm.category ? { category: createForm.category, ...(kind.value === 'labs' ? { labType: createForm.category } : {}) } : {}
    const item = await api<CatalogItemDto>(`/admin/${kind.value}`, {
      method: 'POST',
      body: JSON.stringify({ slug: createForm.slug, title: createForm.title, summary: createForm.summary, payload }),
    })
    dialog.value = false
    Object.assign(createForm, { slug: '', title: '', summary: '', category: '' })
    await load(1)
    selected.value = item
    ElMessage.success(`${noun.value}已创建为草稿`)
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '创建失败')
  } finally {
    loading.value = false
  }
}
const save = async () => {
  if (!selected.value) return
  try {
    selected.value = await api(`/admin/${kind.value}/${selected.value.databaseId || selected.value.id}`, {
      method: 'PATCH',
      body: JSON.stringify(editForm),
    })
    await load()
    ElMessage.success('草稿已保存')
  } catch (reason) {
    ElMessage.error(reason instanceof Error ? reason.message : '保存失败')
  }
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
const reset = () => {
  keyword.value = ''
  status.value = ''
}
</script>

<template>
  <AdminPageHeader :title="title" :description="description" :action="`新建${noun}`" @action="dialog = true" />
  <div class="kpi-grid">
    <AdminKpiCard
      v-for="(label, index) in pageConfig.labels"
      :key="label"
      :icon="[pageConfig.icon, '✓', '◷', '↗'][index]"
      :label="label"
      :value="pageConfig.values[index]"
      :color="pageConfig.colors[index]"
      :change="index === 0 ? '8.2%' : index === 3 ? '6.7%' : undefined"
    />
  </div>
  <div v-if="error" class="error-banner">{{ error }}<button type="button" @click="load()">重试</button></div>

  <section :class="['catalog-workspace', `workspace-${kind}`, 'panel']">
    <div class="catalog-main">
      <div class="catalog-tabs">
        <button v-for="(tab, index) in pageConfig.tabs" :key="tab" type="button" :class="{ active: activeTab === index }" @click="activeTab = index">{{ tab }}</button>
      </div>
      <AdminFilterBar v-model:keyword="keyword" v-model:status="status" :placeholder="`搜索${noun}名称、分类或标签`" @reset="reset">
        <select aria-label="分类筛选"><option>全部分类</option><option v-for="tab in pageConfig.tabs.slice(0, 4)" :key="tab">{{ tab }}</option></select>
        <select aria-label="排序方式"><option>默认排序</option><option>最近更新</option><option>学习人数</option></select>
      </AdminFilterBar>

      <div v-if="result.items.length" :class="['data-list', `domain-list-${kind}`]">
        <button v-for="(item, index) in result.items" :key="item.id" type="button" :class="{ selected: selected?.id === item.id }" @click="selected = item">
          <template v-if="kind === 'themes'">
            <span class="domain-icon">{{ ['▣', '♙', '▧', '⬡', '▤', '♜'][index % 6] }}</span>
            <div class="domain-copy"><strong>{{ item.title }}</strong><small>{{ item.summary }}</small><p><span>课程 {{ metric(item, 'courseCount', 24 + index * 8) }} 门</span><span>学习者 {{ metric(item, 'learners', `${12 - index}.6K`) }}</span></p><AdminStatusTag :status="item.status" /></div>
            <span class="domain-action">进入管理</span>
          </template>
          <template v-else-if="kind === 'courses'">
            <img :src="itemCover(item, index)" alt="" />
            <div class="domain-copy"><strong>{{ item.title }}</strong><small>{{ metric(item, 'teacher', ['周明轩', '陈雨萌', '王清宇'][index % 3]) }}</small></div>
            <span class="domain-chip">{{ category(item) }}</span>
            <span class="domain-chip level">{{ metric(item, 'level', index % 2 ? '初级' : '中级') }}</span>
            <span class="domain-number">{{ metric(item, 'learners', `${12 - index}.6K`) }}</span>
            <AdminStatusTag :status="item.status" />
            <time>{{ new Date(item.updatedAt).toLocaleDateString('zh-CN') }}</time>
          </template>
          <template v-else-if="kind === 'labs'">
            <span class="domain-icon">{{ ['▣', '♙', '>_', '▦', '⬡', '▥'][index % 6] }}</span>
            <div class="domain-copy"><strong>{{ item.title }}</strong><small><span>{{ metric(item, 'hours', 90 + index * 15) }} 分钟</span><span>{{ metric(item, 'learners', `${12 - index}.3K`) }} 人参与</span><span>{{ metric(item, 'steps', 4 + index % 3) }} 步</span></small></div>
            <span class="domain-chip">{{ category(item) }}</span>
            <AdminStatusTag :status="item.status" />
            <time>更新于 {{ new Date(item.updatedAt).toLocaleDateString('zh-CN') }}</time>
          </template>
          <template v-else-if="kind === 'resources'">
            <span class="file-check" :class="{ checked: selected?.id === item.id }">✓</span>
            <span class="file-type">{{ String(metric(item, 'format', ['PDF', 'DOCX', 'PPTX', 'TXT', 'ZIP'][index % 5])) }}</span>
            <div class="domain-copy"><strong>{{ item.title }}</strong><small>{{ item.summary }}</small></div>
            <span>{{ category(item) }}</span>
            <span>造梦少年</span>
            <AdminStatusTag :status="item.status" />
            <time>{{ new Date(item.updatedAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) }}</time>
          </template>
          <template v-else-if="kind === 'articles'">
            <img :src="itemCover(item, index + 1)" alt="" />
            <div class="domain-copy"><strong>{{ item.title }}</strong><small>{{ item.summary }}</small><p><span># {{ category(item) }}</span><span># AI</span><span># 前沿</span></p><footer><time>{{ new Date(item.updatedAt).toLocaleString('zh-CN') }}</time><AdminStatusTag :status="item.status" /><span>阅读 {{ compactMetric(6.3 - index * .4) }}</span><span>热度 {{ compactMetric(12.8 - index * .7) }}</span></footer></div>
            <span class="domain-action">编辑 · 预览 · ⋯</span>
          </template>
          <template v-else>
            <img :src="itemCover(item, index + 2)" alt="" />
            <div class="domain-copy"><strong>{{ item.title }}</strong><small><span class="domain-chip">{{ category(item) }}</span> · {{ item.summary }}</small><time>创建 {{ new Date(item.updatedAt).toLocaleDateString('zh-CN') }}</time></div>
            <AdminStatusTag :status="index % 3 === 0 ? 'active' : item.status" />
            <span class="domain-number">{{ metric(item, 'participants', 2436 - index * 188) }}</span>
            <span>{{ metric(item, 'targetScore', 85 - index * 5) }} 分以上</span>
            <span class="domain-action">查看 · 编辑 · ⋮</span>
          </template>
        </button>
      </div>
      <div v-else class="admin-empty"><span>{{ pageConfig.icon }}</span><strong>暂无匹配{{ noun }}</strong><small>调整筛选条件或创建第一条内容。</small></div>
      <AdminPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="load" />

      <div v-if="kind === 'themes' && selected" class="learning-path-rail">
        <div><strong>学习路径结构（{{ selected.title }}）</strong><small>共 6 个阶段，循序完成知识与实践</small></div>
        <ol><li v-for="(stage, index) in ['入门', '初级', '中级', '高级', '实战项目', '进阶强化']" :key="stage"><i>{{ ['▶', '▤', '▣', '♛', '</>', '🚀'][index] }}</i><b>{{ stage }}</b><small>{{ 3 + index * 5 }} 门课程</small></li></ol>
      </div>
    </div>

    <aside v-if="selected" class="catalog-detail detail-panel">
      <div class="detail-hero">
        <img :src="itemCover(selected)" alt="" />
        <div><AdminStatusTag :status="selected.status" /><h2>{{ selected.title }}</h2><p>{{ selected.summary }}</p></div>
      </div>

      <template v-if="kind === 'themes'">
        <div class="detail-stat-row"><span><b>6</b>学习路径</span><span><b>128</b>课程总数</span><span><b>12.6K</b>学习人数</span><span><b>46.7%</b>完成率</span></div>
        <section class="domain-section"><h3>推荐课程 <a>编辑</a></h3><div class="mini-course" v-for="name in ['大模型入门与提示工程实践', '构建你的第一个 AI Agent', 'RAG 检索增强生成实战']" :key="name"><img :src="learningCover" alt="" /><span><b>{{ name }}</b><small>入门 · ★ 4.8</small></span></div></section>
      </template>
      <template v-else-if="kind === 'courses'">
        <div class="detail-stat-row"><span><b>{{ category(selected) }}</b>课程分类</span><span><b>{{ metric(selected, 'level', '中级') }}</b>课程难度</span><span><b>{{ metric(selected, 'learners', '12.6K') }}</b>学习人数</span></div>
        <section class="domain-section"><h3>内容模块对应前端展示</h3><ul class="config-list"><li v-for="(name, index) in ['课程介绍', '课时大纲', '代码示例', '学习笔记入口', '相关资料', '下一节预告']" :key="name"><i>{{ ['▧', '▤', '</>', '▣', '▱', '▦'][index] }}</i><span><b>{{ name }}</b><small>已配置 · 编辑</small></span></li></ul></section>
      </template>
      <template v-else-if="kind === 'labs'">
        <div class="detail-stat-row"><span><b>90</b>分钟</span><span><b>12.3K</b>参与人数</span><span><b>4</b>步骤数</span></div>
        <section class="domain-section"><h3>工具环境</h3><p class="tool-tags"><span v-for="name in ['Ubuntu 22.04', 'Docker', 'vLLM', 'FastAPI', 'Nginx']" :key="name">{{ name }}</span></p></section>
        <section class="domain-section"><h3>步骤配置（预览）</h3><ul class="config-list"><li v-for="(name, index) in ['目标说明', '实验步骤', '工具环境', '提交结果']" :key="name"><i>{{ index + 1 }}</i><span><b>{{ name }}</b><small>已配置 · 查看</small></span></li></ul></section>
      </template>
      <template v-else-if="kind === 'resources'">
        <section class="resource-preview"><span>{{ String(metric(selected, 'format', 'DOCX')) }}</span><img :src="heroCover" alt="" /></section>
        <div class="detail-stat-row"><span><b>9.8K</b>下载量</span><span><b>3.2 MB</b>文件大小</span><span><b>{{ metric(selected, 'format', 'DOCX') }}</b>文件类型</span></div>
        <section class="domain-section"><h3>标签</h3><p class="tool-tags"><span>提示词工程</span><span>大模型</span><span>技巧</span><span>实战</span></p><h3>可见范围</h3><p>◎ 公开资源（所有用户可见）</p></section>
      </template>
      <template v-else-if="kind === 'articles'">
        <div class="detail-stat-row"><span><b>6,320</b>阅读量</span><span><b>12,800</b>热度</span></div>
        <section class="domain-section"><h3>推荐位</h3><p class="recommendation-row">首页轮播图（位置 1）<b>已推荐</b></p><h3>定时发布</h3><p>发布时间：{{ new Date(selected.updatedAt).toLocaleString('zh-CN') }}</p><p>状态：<span class="green-text">已发布</span></p></section>
        <section class="domain-section schedule-card"><h3>发布日程</h3><div><b>8</b><small>已发布</small><b>5</b><small>待发布</small><b>2</b><small>定时中</small></div></section>
      </template>
      <template v-else>
        <section class="domain-section challenge-goals"><h3>挑战目标</h3><ul><li>准确率达到 85% 以上</li><li>提交有效方案</li><li>排名进入前 30%</li></ul><h3>进度规则</h3><p>参与人数：2,436 人 · 剩余 5 天 · 最高奖励 200 积分</p></section>
        <div class="detail-stat-row"><span><b>42</b>题目数量</span><span><b>0–150</b>分数范围</span><span><b>85</b>最低合格分</span><span><b>显示</b>排行榜</span></div>
        <section class="domain-section"><h3>知识点维度（预览）</h3><div class="knowledge-grid"><span v-for="(name, index) in ['机器学习基础', '深度学习基础', '数据分析与处理', '编程与算法', '计算机视觉', '自然语言处理', '数据可视化', 'AI 应用实践']" :key="name"><small>{{ name }}</small><b>{{ 64 + index * 4 }}%</b></span></div></section>
      </template>

      <form class="domain-edit-form" @submit.prevent="save">
        <h3>{{ noun }}详情与发布</h3>
        <label>{{ noun }}标题<input v-model="editForm.title" maxlength="120" required /></label>
        <label>摘要<textarea v-model="editForm.summary" maxlength="500" rows="3" required /></label>
        <label>展示排序<input v-model.number="editForm.sortOrder" type="number" min="0" /></label>
        <div class="detail-actions">
          <button class="admin-secondary" type="submit" :disabled="loading">保存草稿</button>
          <button v-if="selected.status !== 'published'" class="admin-primary" type="button" :disabled="loading" @click="publish">发布{{ noun }}</button>
          <button v-else class="admin-danger" type="button" :disabled="loading" @click="archive">下架{{ noun }}</button>
        </div>
      </form>
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
