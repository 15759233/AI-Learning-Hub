<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CourseCard from '../components/CourseCard.vue'
import PageHero from '../components/PageHero.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { assets, courses } from '../data/mock'

const route = useRoute()
const router = useRouter()
const query = ref(String(route.query.q || ''))
const category = ref(String(route.query.category || '全部主题'))
const level = ref(String(route.query.level || '全部难度'))
const duration = ref(String(route.query.duration || '全部时长'))
const mode = ref(String(route.query.mode || '全部方式'))
const sort = ref(String(route.query.sort || '综合排序'))
const categories = ['全部主题', '大模型 LLM', 'AI Agent', '图像生成', '模型部署', '智能硬件', 'AI 安全']
const pathSteps = ['了解 AI 基础', 'Python 入门', '大模型应用', '构建 AI 应用', '部署与优化', '进阶与创新']

const filtered = computed(() => {
  const keyword = query.value.trim().toLowerCase()
  const result = courses.filter((course) =>
    (!keyword || `${course.title}${course.description}${course.category}`.toLowerCase().includes(keyword)) &&
    (category.value === '全部主题' || course.category === category.value) &&
    (level.value === '全部难度' || course.level === level.value) &&
    (duration.value === '全部时长' ||
      (duration.value === '0～2 小时' && course.hours <= 2) ||
      (duration.value === '2～5 小时' && course.hours > 2 && course.hours <= 5) ||
      (duration.value === '5～10 小时' && course.hours > 5 && course.hours <= 10) ||
      (duration.value === '10 小时以上' && course.hours > 10)) &&
    (mode.value === '全部方式' || course.mode === mode.value))
  return sort.value === '时长最短' ? [...result].sort((a, b) => a.hours - b.hours) : sort.value === '学习人数' ? [...result].sort((a, b) => b.learners - a.learners) : result
})

watch([query, category, level, duration, mode, sort], () => {
  const params: Record<string, string> = {}
  if (query.value) params.q = query.value
  if (category.value !== '全部主题') params.category = category.value
  if (level.value !== '全部难度') params.level = level.value
  if (duration.value !== '全部时长') params.duration = duration.value
  if (mode.value !== '全部方式') params.mode = mode.value
  if (sort.value !== '综合排序') params.sort = sort.value
  router.replace({ query: params })
})

const reset = () => {
  query.value = ''
  category.value = '全部主题'
  level.value = '全部难度'
  duration.value = '全部时长'
  mode.value = '全部方式'
  sort.value = '综合排序'
}
</script>

<template>
  <div class="page-container">
    <PageHero title="学习主题" description="系统化学习 AI 核心主题，从理论到实践，掌握前沿技术，用 AI 能力创造属于你的作品。" :image="assets.learningCover">
      <form class="hero-search" role="search" @submit.prevent><input v-model="query" aria-label="搜索课程" placeholder="搜索课程、主题或技能…" /><button class="button primary" type="submit">搜索</button></form>
    </PageHero>
    <div class="category-tabs" role="tablist" aria-label="课程主题分类">
      <button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button>
    </div>
    <section class="learning-path"><div class="section-heading"><h2>推荐学习路径</h2><span>从入门到实践，逐步掌握 AI 能力</span><RouterLink to="/profile">查看完整路径 →</RouterLink></div><div class="path-steps"><div v-for="(step, index) in pathSteps" :key="step" :class="{ done: index < 2, current: index === 2 }"><span>{{ String(index + 1).padStart(2, '0') }}</span><strong>{{ step }}</strong></div></div></section>
    <div class="catalog-layout">
      <aside class="filter-panel">
        <div class="panel-title"><strong>筛选条件</strong><button type="button" @click="reset">清空</button></div>
        <label>难度<select v-model="level"><option>全部难度</option><option>入门</option><option>初级</option><option>中级</option><option>高级</option></select></label>
        <label>学习时长<select v-model="duration"><option>全部时长</option><option>0～2 小时</option><option>2～5 小时</option><option>5～10 小时</option><option>10 小时以上</option></select></label>
        <label>学习方式<select v-model="mode"><option>全部方式</option><option>视频</option><option>图文</option><option>实战项目</option><option>互动实验</option></select></label>
        <button class="button secondary full-width" type="button" @click="reset">重置筛选</button>
      </aside>
      <section class="catalog-main">
        <div class="catalog-toolbar"><strong>全部课程 <small>共 {{ filtered.length }} 门课程</small></strong><select v-model="sort" aria-label="课程排序"><option>综合排序</option><option>时长最短</option><option>学习人数</option></select></div>
        <div v-if="filtered.length" class="card-grid three"><CourseCard v-for="course in filtered" :key="course.id" :course="course" /></div>
        <div v-else class="inline-empty"><h3>没有找到匹配课程</h3><p>试试清空筛选条件。</p><button class="button secondary" type="button" @click="reset">重置筛选</button></div>
      </section>
      <aside class="study-aside">
        <h3>我的学习进度</h3><div class="progress-ring"><strong>42%</strong><span>总进度</span></div><ProgressBar :value="42" label="本周目标" />
        <div class="mini-stats"><span><strong>16</strong>已学课程</span><span><strong>28.6h</strong>学习时长</span><span><strong>3</strong>获得证书</span></div>
        <h3>本周学习活跃度</h3><div class="activity-heatmap" aria-label="本周学习活跃度"><span v-for="index in 28" :key="index" :class="`level-${index % 5}`" :title="`学习强度 ${index % 5}`" /></div>
        <h3>最近学习</h3><RouterLink v-for="course in courses.slice(0, 3)" :key="course.id" :to="`/courses/${course.id}`">{{ course.title }}<small>继续学习 →</small></RouterLink>
        <h3>学习成就</h3><div class="mini-achievements"><span><strong>◆</strong>连续学习 7 天</span><span><strong>⬢</strong>课程达人</span><span><strong>✦</strong>实验先锋</span></div><RouterLink to="/profile">查看全部成就 →</RouterLink>
      </aside>
    </div>
    <section><div class="section-heading"><div><span class="eyebrow">个性推荐</span><h2>为你推荐</h2></div></div><div class="recommendation-row"><CourseCard v-for="course in courses.slice(4, 9)" :key="course.id" :course="course" compact /></div></section>
  </div>
</template>
