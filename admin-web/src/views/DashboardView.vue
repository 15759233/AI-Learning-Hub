<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import TrendChart from '../components/TrendChart.vue'
import { api } from '../services/api'

interface Dashboard {
  kpis: Record<'users' | 'activeUsers' | 'publishedCourses' | 'labParticipants', { current: number; previous: number; changeRate: number | null }>
  trend: Array<{ date: string; activeUsers: number; learningMinutes: number }>
  moduleCounts: Record<string, number>
  todos: Array<{ id: string; title: string; module: string; dueAt: string | null; route: string; priority: string }>
  operations: Array<{ id: string; method: string; path: string; result: string; createdAt: string }>
}
const data = ref<Dashboard | null>(null)
const error = ref('')
const modules = [
  ['⌂', '首页运营', '管理模块与推荐', '/homepage', '#ff4d1f'],
  ['▤', '学习主题', '维护主题与路径', '/themes', '#22b66c'],
  ['▣', '课程内容', '编辑课程与章节', '/courses', '#7c4dff'],
  ['⬡', '实训项目', '配置步骤与运行', '/labs', '#3478f6'],
  ['▱', '资源中心', '上传与发布资源', '/resources', '#f2a500'],
  ['◉', 'AI 前沿', '资讯与推荐位', '/articles', '#7c4dff'],
  ['▦', '挑战测评', '挑战与题库', '/challenges', '#ee4f84'],
  ['♙', '用户成长', '学习者与成长', '/growth', '#22b66c'],
]
const change = (value?: number | null) => value === null || value === undefined ? undefined : `${value > 0 ? '+' : ''}${value}%`
onMounted(async () => {
  try { data.value = await api('/admin/dashboard') } catch (reason) { error.value = reason instanceof Error ? reason.message : '加载失败' }
})
</script>

<template>
  <AdminPageHeader title="数据看板" description="平台内容与真实学习行为概览" />
  <div v-if="error" class="error-banner">{{ error }}</div>
  <div class="kpi-grid">
    <AdminKpiCard icon="♟" label="总用户数" :value="data?.kpis.users.current ?? '—'" color="#ff4d1f" :change="change(data?.kpis.users.changeRate)" />
    <AdminKpiCard icon="▰" label="近 7 日活跃用户" :value="data?.kpis.activeUsers.current ?? '—'" color="#22b66c" :change="change(data?.kpis.activeUsers.changeRate)" />
    <AdminKpiCard icon="▣" label="近 7 日课程发布" :value="data?.kpis.publishedCourses.current ?? '—'" color="#7c4dff" :change="change(data?.kpis.publishedCourses.changeRate)" />
    <AdminKpiCard icon="⬡" label="近 7 日实训参与" :value="data?.kpis.labParticipants.current ?? '—'" color="#3478f6" :change="change(data?.kpis.labParticipants.changeRate)" />
  </div>
  <section class="panel module-overview"><h2>模块运营概览</h2><div><RouterLink v-for="[icon, title, text, path, color] in modules" :key="path" :to="path"><i :style="{ background: `${color}16`, color }">{{ icon }}</i><strong>{{ title }}</strong><small>{{ text }} · {{ data?.moduleCounts[String(path).slice(1)] ?? '—' }} 项</small><span>进入管理 →</span></RouterLink></div></section>
  <div class="dashboard-bottom">
    <section class="panel trend-panel"><div class="panel-heading"><h2>平台活跃趋势</h2><span>近 7 天</span></div><div class="chart-legend"><span>— 活跃用户数</span><span>— 学习分钟</span></div><TrendChart :data="data?.trend || []" /><div class="trend-summary"><span>最近一天活跃用户<b>{{ data?.trend.at(-1)?.activeUsers ?? '—' }}</b></span><span>最近一天学习分钟<b>{{ data?.trend.at(-1)?.learningMinutes ?? '—' }}</b></span></div></section>
    <div class="dashboard-side-stack">
      <section class="panel todo-panel"><div class="panel-heading"><h2>待办事项</h2></div><ul><li v-for="item in data?.todos.slice(0, 4)" :key="item.id"><i>▧</i><div><strong>{{ item.title }}</strong><small>{{ item.module }} · {{ item.priority }}</small></div><time>{{ item.dueAt ? new Date(item.dueAt).toLocaleString('zh-CN') : '无截止时间' }}</time></li><li v-if="!data?.todos.length" class="empty-row">暂无待审核、待发布或定时任务。</li></ul></section>
      <section class="panel quick-actions"><h2>快捷操作</h2><div><RouterLink to="/themes">＋<small>新建主题</small></RouterLink><RouterLink to="/courses">▶<small>新建课程</small></RouterLink><RouterLink to="/articles">▤<small>发布资讯</small></RouterLink><RouterLink to="/resources">↥<small>上传资源</small></RouterLink></div></section>
    </div>
  </div>
  <section class="panel recent-operations"><div class="panel-heading"><h2>最近操作</h2><RouterLink to="/settings">查看全部 →</RouterLink></div><div v-for="item in data?.operations.slice(0, 4)" :key="item.id"><i>管</i><span><b>{{ item.method }}</b> {{ item.path }}（{{ item.result }}）</span><small>{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</small></div><p v-if="!data?.operations.length">暂无管理操作日志。</p></section>
</template>
