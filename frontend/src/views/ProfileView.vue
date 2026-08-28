<script setup lang="ts">
import { computed, ref } from 'vue'
import ProgressBar from '../components/ProgressBar.vue'
import { articles, courses, labs, resources, userProfile } from '../data/mock'
import { useLearningStore } from '../stores/learning'

const store = useLearningStore()
const editOpen = ref(false)
const settingsOpen = ref(false)
const planOpen = ref(false)
const badgeOpen = ref('')
const favoriteTab = ref('全部')
const displayName = ref(userProfile.name)
const favoriteItems = computed(() => {
  const all = [
    ...courses.map((item) => ({ id: item.id, title: item.title, type: '课程', date: '2026-08-28' })),
    ...labs.map((item) => ({ id: item.id, title: item.title, type: '实验', date: '2026-08-27' })),
    ...resources.map((item) => ({ id: item.id, title: item.title, type: '资源', date: item.updatedAt })),
    ...articles.map((item) => ({ id: item.id, title: item.title, type: '文章', date: item.publishedAt })),
  ].filter((item) => store.favorites.includes(item.id))
  return favoriteTab.value === '全部' ? all : all.filter((item) => item.type === favoriteTab.value)
})
const abilities = [
  ['AI 工程实践', 76, '#ff4d1f'], ['数据理解与处理', 64, '#27b86b'], ['模型应用', 82, '#6e5bff'],
  ['AI 创新与设计', 58, '#e5a91d'], ['编程与工具', 74, '#3478f6'], ['AI 素养与伦理', 69, '#27b86b'],
]
const badges = ['AI 工程践行者', '数据探索者', '模型应用达人', '创新思维之星', '编程高手', '学习坚持者']
</script>

<template>
  <div class="page-container profile-page">
    <section class="profile-hero">
      <div class="profile-user"><span class="large-avatar">梦</span><div><h1>{{ displayName }} <small>高校认证</small></h1><p>{{ userProfile.program }}</p><span>用 AI 探索世界，用创造改变未来。</span><div class="hero-actions"><button class="button secondary small" type="button" @click="editOpen = true">编辑资料</button><button class="button secondary small" type="button" @click="settingsOpen = true">账号设置</button></div></div></div>
      <div class="profile-level"><div><strong>🔥 Lv.{{ userProfile.level }}</strong><span>离下一等级还差 1200 经验值</span></div><ProgressBar :value="82" /><div class="profile-kpis"><span><strong>{{ userProfile.streak }}</strong>连续学习/天</span><span><strong>{{ userProfile.weeklyHours }}h</strong>本周学习</span><span><strong>{{ userProfile.points }}</strong>成就点</span></div></div>
    </section>
    <section><div class="section-heading"><h2>学习总览</h2><RouterLink to="/assessments">学习数据详情 →</RouterLink></div><div class="stat-row six"><article v-for="[label, value] in [['累计学习时长', '128.6h'], ['完成课程', '24 门'], ['完成实验', '18 个'], ['获得徽章', '86 枚'], ['获得证书', '12 张'], ['成就点', '3280']] " :key="label"><strong>{{ value }}</strong><span>{{ label }}</span></article></div></section>
    <section><div class="section-heading"><h2>我的 AI 能力卡</h2></div><div class="capability-layout"><div class="ability-profile-grid"><article v-for="[title, value, color] in abilities" :key="title"><span class="direction-icon">◇</span><div><h3>{{ title }}</h3><small>Lv.{{ Math.ceil(Number(value) / 20) }} · 进阶者</small><div class="mini-progress"><i :style="{ width: `${value}%`, background: String(color) }" /></div></div></article></div><aside class="radar-card"><h3>综合能力雷达</h3><svg viewBox="0 0 220 200" role="img" aria-label="我的能力与同级平均能力雷达图"><polygon points="110,18 190,65 180,155 110,188 40,155 30,65" fill="none" stroke="#e6e2de" /><polygon points="110,52 160,79 152,134 109,157 64,134 60,80" fill="rgba(110,91,255,.08)" stroke="#6e5bff" stroke-width="2" stroke-dasharray="5 5" /><polygon points="110,42 168,75 160,140 108,165 57,138 53,75" fill="rgba(255,77,31,.18)" stroke="#ff4d1f" stroke-width="3" /><line v-for="point in ['110,18', '190,65', '180,155', '110,188', '40,155', '30,65']" :key="point" x1="110" y1="100" :x2="point.split(',')[0]" :y2="point.split(',')[1]" stroke="#eee" /></svg><div class="radar-legend"><span><i class="mine" />我的能力</span><span><i class="average" />同级平均</span></div><p>综合能力评级：<strong>进阶者</strong></p><span>超过本校 86% 的同学</span></aside></div></section>
    <section><div class="section-heading"><h2>我的徽章墙</h2><button class="text-link" type="button" @click="badgeOpen = '全部徽章'">查看全部（86）→</button></div><div class="badge-wall"><button v-for="(badge, index) in [...badges, '更多成就']" :key="badge" type="button" :class="{ locked: index === 6 }" @click="badgeOpen = badge"><span>{{ index === 6 ? '◇' : ['◆', '⬢', '✦', '✹', '⌘', '●'][index] }}</span><strong>{{ badge }}</strong><small>{{ index === 6 ? '保持学习解锁' : `2026-0${index + 3}-12` }}</small></button></div></section>
    <div class="profile-two-column">
      <section><div class="section-heading"><h2>最近学习课程</h2><RouterLink to="/topics">全部课程 →</RouterLink></div><div class="record-list"><article v-for="course in courses.slice(0, 4)" :key="course.id"><div><strong>{{ course.title }}</strong><small>{{ course.hours }} 小时 · 最近学习</small><ProgressBar :value="course.progress || 0" /></div><RouterLink class="button primary small" :to="`/courses/${course.id}`">继续学习</RouterLink></article></div></section>
      <section><div class="section-heading"><h2>实践记录</h2><RouterLink to="/labs">全部实验 →</RouterLink></div><div class="record-list"><article v-for="(lab, index) in labs.slice(0, 4)" :key="lab.id"><div><strong>{{ lab.title }}</strong><small>完成度 {{ lab.completion }}% · 提交于 2026-08-{{ 28 - index }} · 演示记录</small><ProgressBar :value="lab.completion" /></div><RouterLink class="button primary small" :to="`/labs/${lab.id}`">进入实验</RouterLink></article></div></section>
    </div>
    <div class="profile-two-column">
      <section class="favorites-panel"><div class="section-heading"><h2>我的收藏</h2></div><div class="compact-tabs"><button v-for="tab in ['全部', '课程', '实验', '资源', '文章']" :key="tab" type="button" :class="{ active: favoriteTab === tab }" @click="favoriteTab = tab">{{ tab }}</button></div><div v-if="favoriteItems.length" class="favorite-list"><div v-for="item in favoriteItems" :key="item.id"><span class="tag">{{ item.type }}</span><strong>{{ item.title }}</strong><small>收藏于 {{ item.date }}</small><button type="button" @click="store.toggleFavorite(item.id)">取消收藏</button></div></div><div v-else class="inline-empty small-empty"><p>还没有收藏内容。</p><RouterLink to="/topics">去发现课程 →</RouterLink></div></section>
      <section class="plan-card"><div class="section-heading"><h2>学习计划</h2><button class="text-link" type="button" @click="planOpen = true">创建计划 →</button></div><span class="tag green">进行中</span><h3>大模型进阶学习计划</h3><p>2026-08-01 — 2026-09-30</p><ProgressBar :value="50" label="已完成 6 / 12" /><ul><li class="done">大模型基础原理</li><li class="done">提示词工程进阶</li><li>RAG 检索与应用</li><li>大模型微调实战</li></ul></section>
    </div>
    <section class="profile-cta"><div><h2>你已经超过了 <em>86%</em> 的同学，继续加油！</h2><p>每一次学习、每一次解决问题的积累，都在增长你的 AI 能力。</p><RouterLink class="button primary" to="/topics">探索更多课程</RouterLink></div><div class="profile-kpis"><span><strong>18.6h</strong>本月学习时长</span><span><strong>7 个</strong>本月实验完成</span><span><strong>860 分</strong>本月成就点</span></div><div class="trophy">🏆</div></section>
  </div>
  <dialog :open="editOpen" class="search-dialog" @close="editOpen = false"><form class="dialog-card" @submit.prevent="editOpen = false"><div class="dialog-title"><strong>编辑资料</strong><button class="icon-button" type="button" @click="editOpen = false">×</button></div><label>昵称<input v-model="displayName" required maxlength="20" /></label><label>个人介绍<textarea rows="4">用 AI 探索世界，用创造改变未来。</textarea></label><button class="button primary" type="submit">保存到本地</button></form></dialog>
  <dialog :open="settingsOpen" class="search-dialog" @close="settingsOpen = false"><div class="dialog-card"><div class="dialog-title"><strong>账号设置</strong><button class="icon-button" type="button" @click="settingsOpen = false">×</button></div><div class="notice">演示模式：账号安全与通知设置待统一用户服务接入。</div><button class="button secondary" type="button" disabled>设置接口待接入</button></div></dialog>
  <dialog :open="planOpen" class="search-dialog" @close="planOpen = false"><form class="dialog-card" @submit.prevent="planOpen = false"><div class="dialog-title"><strong>创建学习计划</strong><button class="icon-button" type="button" @click="planOpen = false">×</button></div><label>计划名称<input required value="我的 AI 学习计划" /></label><label>目标日期<input required type="date" /></label><div class="notice">演示模式：计划仅保存在当前页面状态，后端接口待接入。</div><button class="button primary" type="submit">创建演示计划</button></form></dialog>
  <dialog :open="!!badgeOpen" class="search-dialog" @close="badgeOpen = ''"><div class="dialog-card"><div class="dialog-title"><strong>{{ badgeOpen }}</strong><button class="icon-button" type="button" @click="badgeOpen = ''">×</button></div><div class="badge-detail">◆</div><p>完成对应学习与实践目标后获得。当前徽章数据为演示内容。</p></div></dialog>
</template>
