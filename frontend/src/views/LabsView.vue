<script setup lang="ts">
import { computed, ref } from 'vue'
import AppDialog from '../components/base/AppDialog.vue'
import CategoryCover from '../components/base/CategoryCover.vue'
import LabCard from '../components/cards/LabCard.vue'
import PageHero from '../components/PageHero.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { assets, labs } from '../data/mock'
import { useLearningStore } from '../stores/learning'

const store = useLearningStore()
const category = ref('全部实验')
const sort = ref('综合排序')
const visible = ref(8)
const toolsOpen = ref(false)
const categories = ['全部实验', '模型部署', 'AI Agent', 'Linux 命令', '智能硬件']
const filtered = computed(() => {
  const result = labs.filter((lab) => category.value === '全部实验' || lab.category === category.value)
  const levelOrder: Record<string, number> = { 入门: 1, 中级: 2, 进阶: 3 }
  if (sort.value === '难度优先') return [...result].sort((a, b) => levelOrder[a.level] - levelOrder[b.level])
  if (sort.value === '时长最短') return [...result].sort((a, b) => a.minutes - b.minutes)
  if (sort.value === '参与最多') return [...result].sort((a, b) => b.learners - a.learners)
  if (sort.value === '最新发布') return [...result].reverse()
  return result
})
</script>

<template>
  <div class="page-container">
    <PageHero eyebrow="实践你的 AI 能力" title="模拟实训中心" description="在真实感云环境中动手实践，通过受控步骤、即时反馈与结果验证掌握 AI 工程技能。" :image="assets.heroCampus">
      <div class="value-pills"><span>◈ 真实感环境</span><span>↗ 循序渐进</span><span>✓ 即时反馈</span><span>◆ 学以致用</span></div>
    </PageHero>
    <div class="category-tabs" role="tablist"><button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button></div>
    <section class="featured-lab">
      <img :src="assets.labCover" alt="模型部署与 Agent 工作流实训插画" />
      <div><span class="tag orange">推荐实训</span><h2>从零部署大语言模型服务</h2><p>在受控模拟环境中完成服务准备、启动、健康检查和结果验证。</p><div class="meta"><span>中级</span><span>90 分钟</span><span>7 个步骤</span><span>8,932 人参与</span></div><ProgressBar :value="66" label="完成率" /></div>
      <div class="featured-actions"><RouterLink class="button primary" to="/labs/model-service">立即开始实验</RouterLink><RouterLink class="button secondary" to="/labs/model-service">查看详情</RouterLink></div>
    </section>
    <div class="labs-layout">
      <section>
        <div class="catalog-toolbar"><strong>全部实训 <small>{{ filtered.length }} 个项目</small></strong><select v-model="sort" aria-label="实训排序"><option>综合排序</option><option>难度优先</option><option>时长最短</option><option>最新发布</option><option>参与最多</option></select></div>
        <div class="four-grid"><LabCard v-for="lab in filtered.slice(0, visible)" :key="lab.id" :lab="lab" /></div>
      </section>
      <aside class="study-aside lab-aside"><h3>实训规则</h3><ul><li>首版仅使用受控模拟环境。</li><li>命令经过白名单，不连接真实 Shell。</li><li>步骤、日志和结果由同一状态机驱动。</li></ul><button class="button secondary full-width" type="button" @click="toolsOpen = true">环境与工具说明</button><h3>我的实验记录</h3><div v-if="store.recentLabs.length" class="lab-record-list"><RouterLink v-for="labId in store.recentLabs.slice(0, 4)" :key="labId" :to="`/labs/${labId}`">最近学习 · {{ labs.find((item) => item.id === labId)?.title || labId }} <small>{{ store.labProgress[labId] || 0 }}%</small></RouterLink></div><p v-else>还没有实验记录。</p><RouterLink class="button primary full-width" :to="`/labs/${store.recentLabs[0] || 'agent-workbench'}`">继续学习</RouterLink><h3>本地完成</h3><strong class="big-number">{{ store.submittedLabs.length }}</strong><div class="lab-badges"><span>◆ 受控环境</span><span>⬢ 白名单工具</span><span>◇ 演示报告</span></div></aside>
    </div>
    <section><div class="section-heading"><div><span class="eyebrow">推荐路径</span><h2>选择一条实训成长路线</h2></div></div><div class="three-grid path-cards"><article v-for="(title, index) in ['AI 工程师入门路径', '大模型应用开发路径', '智能硬件 + AI 实战路径']" :key="title"><span>路径 0{{ index + 1 }}</span><div class="path-node-icons" aria-hidden="true"><i /><i /><i /><i /></div><h3>{{ title }}</h3><p>{{ 6 + index * 2 }} 个实验 · {{ 12 + index * 4 }} 小时 · {{ 3260 - index * 420 }} 人学习</p><RouterLink to="/labs">查看路径 →</RouterLink></article></div></section>
    <section><div class="section-heading"><div><span class="eyebrow">本周热度</span><h2>本周热门实验</h2></div></div><div class="hot-lab-ranking"><RouterLink v-for="(lab, index) in [...labs].sort((a, b) => b.learners - a.learners).slice(0, 5)" :key="lab.id" :to="`/labs/${lab.id}`"><strong>0{{ index + 1 }}</strong><CategoryCover :title="lab.title" :variant="lab.coverVariant" :icon="lab.icon" /><span>{{ lab.title }}<small>{{ lab.learners.toLocaleString() }} 人参与</small></span><em>{{ 98 - index * 7 }} 热度</em></RouterLink></div></section>
  </div>
  <AppDialog v-model="toolsOpen" title="环境与工具说明"><p>模拟环境使用预设步骤、白名单命令和状态机，不连接真实服务器 Shell。</p><ul><li>Agent 流程：Vue Flow</li><li>运行日志：xterm.js 只读终端</li><li>工具调用：仅允许前端演示白名单</li></ul></AppDialog>
</template>
