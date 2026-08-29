<script setup lang="ts">
import { onMounted, ref } from 'vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import TrendChart from '../components/TrendChart.vue'
import { api } from '../services/api'

interface Dashboard {
  kpis: { users: number; active: number; courses: number; labRuns: number }
  activity: Array<{ id: string; eventType: string; targetType: string | null; createdAt: string }>
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
onMounted(async () => {
  try { data.value = await api('/admin/dashboard') } catch (reason) { error.value = reason instanceof Error ? reason.message : '加载失败' }
})
</script>

<template>
  <AdminPageHeader title="数据看板" description="平台内容与真实学习行为概览" />
  <div v-if="error" class="error-banner">{{ error }}</div>
  <div class="kpi-grid">
    <AdminKpiCard icon="♟" label="总用户数" :value="data?.kpis.users ?? '—'" color="#ff4d1f" change="3.2%" />
    <AdminKpiCard icon="▰" label="活跃学习人数" :value="data?.kpis.active ?? '—'" color="#22b66c" change="6.8%" />
    <AdminKpiCard icon="▣" label="本周课程发布" :value="data?.kpis.courses ?? '—'" color="#7c4dff" change="20%" />
    <AdminKpiCard icon="⬡" label="本周实训参与" :value="data?.kpis.labRuns ?? '—'" color="#3478f6" change="8.4%" />
  </div>
  <section class="panel module-overview"><h2>模块运营概览</h2><div><RouterLink v-for="[icon, title, text, path, color] in modules" :key="path" :to="path"><i :style="{ background: `${color}16`, color }">{{ icon }}</i><strong>{{ title }}</strong><small>{{ text }}</small><span>进入管理 →</span></RouterLink></div></section>
  <div class="dashboard-bottom">
    <section class="panel trend-panel"><div class="panel-heading"><h2>平台活跃趋势</h2><select><option>近 7 天</option></select></div><TrendChart /></section>
    <section class="panel todo-panel"><div class="panel-heading"><h2>最近业务事件</h2><RouterLink to="/growth">查看全部 →</RouterLink></div><ul><li v-for="item in data?.activity.slice(0, 5)" :key="item.id"><i>◇</i><div><strong>{{ item.eventType }}</strong><small>{{ item.targetType || 'platform' }}</small></div><time>{{ new Date(item.createdAt).toLocaleString('zh-CN') }}</time></li><li v-if="!data?.activity.length" class="empty-row">暂无行为事件，学生端操作后会实时出现。</li></ul></section>
  </div>
</template>
