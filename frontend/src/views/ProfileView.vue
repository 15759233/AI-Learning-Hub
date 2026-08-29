<script setup lang="ts">
import { computed, ref } from 'vue'
import AppDialog from '../components/base/AppDialog.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { articles, courses, labs, resources, userProfile } from '../data/mock'
import { dataMode } from '../services/api/client'
import { useLearningStore } from '../stores/learning'

const store = useLearningStore()
const editOpen = ref(false)
const settingsOpen = ref(false)
const planOpen = ref(false)
const badgeOpen = ref('')
const favoriteTab = ref('全部')
const editName = ref(store.profile.nickname)
const editBio = ref(store.profile.bio)
const planName = ref('')
const planDate = ref('')
const favoriteItems = computed(() => {
  const all = [
    ...courses.map((item) => ({ id: item.id, title: item.title, type: '课程', favoriteType: 'course' as const, date: '2026-08-28' })),
    ...labs.map((item) => ({ id: item.id, title: item.title, type: '实验', favoriteType: 'lab' as const, date: '2026-08-27' })),
    ...resources.map((item) => ({ id: item.id, title: item.title, type: '资源', favoriteType: 'resource' as const, date: item.updatedAt })),
    ...articles.map((item) => ({ id: item.id, title: item.title, type: '文章', favoriteType: 'article' as const, date: item.publishedAt })),
  ].filter((item) => store.isFavorite(item.favoriteType, item.id))
  return favoriteTab.value === '全部' ? all : all.filter((item) => item.type === favoriteTab.value)
})
const completedCourses = computed(() => Object.values(store.courseProgress).filter((progress) => progress === 100).length)
const completedLabs = computed(() => store.submittedLabs.length)
const recentCourses = computed(() => store.recentCourses.map((id) => courses.find((course) => course.id === id)).filter((course): course is (typeof courses)[number] => !!course))
const recentLabs = computed(() => store.recentLabs.map((id) => labs.find((lab) => lab.id === id)).filter((lab): lab is (typeof labs)[number] => !!lab))
const abilities = [
  ['AI 工程实践', 76, '#ff4d1f'], ['数据理解与处理', 64, '#27b86b'], ['模型应用', 82, '#6e5bff'],
  ['AI 创新与设计', 58, '#e5a91d'], ['编程与工具', 74, '#3478f6'], ['AI 素养与伦理', 69, '#27b86b'],
]
const badges = ['AI 工程践行者', '数据探索者', '模型应用达人', '创新思维之星', '编程高手', '学习坚持者']
const openEdit = () => {
  editName.value = store.profile.nickname
  editBio.value = store.profile.bio
  editOpen.value = true
}
const saveProfile = () => {
  store.saveProfile(editName.value, editBio.value)
  editOpen.value = false
}
const createPlan = async () => {
  if (!planName.value.trim() || !planDate.value) return
  if (!await store.addPlan({
    id: `plan-${Date.now()}`,
    name: planName.value.trim(),
    targetDate: planDate.value,
    status: '进行中',
  })) return
  planName.value = ''
  planDate.value = ''
  planOpen.value = false
}
</script>

<template>
  <div class="page-container profile-page">
    <section class="profile-hero">
      <div class="profile-user"><span class="large-avatar">{{ store.profile.nickname.slice(0, 1) }}</span><div><h1>{{ store.profile.nickname }} <small>高校认证</small></h1><p>{{ userProfile.program }}</p><span>{{ store.profile.bio }}</span><div class="hero-actions"><button class="button secondary small" type="button" @click="openEdit">编辑资料</button><button class="button secondary small" type="button" @click="settingsOpen = true">账号设置</button></div></div></div>
      <div class="profile-level"><div><strong>🔥 Lv.{{ userProfile.level }}</strong><span>离下一等级还差 1200 经验值</span></div><ProgressBar :value="82" /><div class="profile-kpis"><span><strong>{{ userProfile.streak }}</strong>连续学习/天</span><span><strong>{{ userProfile.weeklyHours }}h</strong>本周学习</span><span><strong>{{ dataMode === 'api' ? (store.serverGrowth?.points || 0) : userProfile.points }}</strong>成就点</span></div></div>
    </section>
    <section><div class="section-heading"><h2>学习总览</h2><RouterLink to="/assessments">学习数据详情 →</RouterLink></div><div class="stat-row six"><article v-for="[label, value] in [['最近课程', `${store.recentCourses.length} 门`], ['完成课程', `${completedCourses} 门`], ['完成实验', `${completedLabs} 个`], ['收藏内容', `${store.favorites.length} 项`], ['学习计划', `${store.plans.length} 个`], ['测评入口', `${store.assessmentRecords.length} 次`]] " :key="label"><strong>{{ value }}</strong><span>{{ label }}</span></article></div></section>
    <section><div class="section-heading"><h2>我的 AI 能力卡</h2></div><div class="capability-layout"><div class="ability-profile-grid"><article v-for="[title, value, color] in abilities" :key="title"><span class="direction-icon">◇</span><div><h3>{{ title }}</h3><small>Lv.{{ Math.ceil(Number(value) / 20) }} · 进阶者</small><div class="mini-progress"><i :style="{ width: `${value}%`, background: String(color) }" /></div></div></article></div><aside class="radar-card"><h3>综合能力雷达</h3><svg viewBox="0 0 220 200" role="img" aria-label="我的能力与同级平均能力雷达图"><polygon points="110,18 190,65 180,155 110,188 40,155 30,65" fill="none" stroke="#e6e2de" /><polygon points="110,52 160,79 152,134 109,157 64,134 60,80" fill="rgba(110,91,255,.08)" stroke="#6e5bff" stroke-width="2" stroke-dasharray="5 5" /><polygon points="110,42 168,75 160,140 108,165 57,138 53,75" fill="rgba(255,77,31,.18)" stroke="#ff4d1f" stroke-width="3" /><line v-for="point in ['110,18', '190,65', '180,155', '110,188', '40,155', '30,65']" :key="point" x1="110" y1="100" :x2="point.split(',')[0]" :y2="point.split(',')[1]" stroke="#eee" /></svg><div class="radar-legend"><span><i class="mine" />我的能力</span><span><i class="average" />同级平均</span></div><p>综合能力评级：<strong>进阶者</strong></p><span>超过本校 86% 的同学</span></aside></div></section>
    <section><div class="section-heading"><h2>我的徽章墙</h2><button class="text-link" type="button" @click="badgeOpen = '全部徽章'">查看全部（{{ dataMode === 'api' ? (store.serverGrowth?.achievements || 0) : 86 }}）→</button></div><div class="badge-wall"><button v-for="(badge, index) in [...badges, '更多成就']" :key="badge" type="button" :class="{ locked: index >= (dataMode === 'api' ? (store.serverGrowth?.achievements || 0) : 6) }" @click="badgeOpen = badge"><span>{{ index === 6 ? '◇' : ['◆', '⬢', '✦', '✹', '⌘', '●'][index] }}</span><strong>{{ badge }}</strong><small>{{ index >= (dataMode === 'api' ? (store.serverGrowth?.achievements || 0) : 6) ? '保持学习解锁' : '已由服务端发放' }}</small></button></div></section>
    <div class="profile-two-column">
      <section><div class="section-heading"><h2>最近学习课程</h2><RouterLink to="/topics">全部课程 →</RouterLink></div><div class="record-list"><article v-for="course in recentCourses" :key="course.id"><div><strong>{{ course.title }}</strong><small>{{ course.hours }} 小时 · {{ dataMode === 'api' ? '账号学习记录' : '本地学习记录' }}</small><ProgressBar :value="store.courseProgress[course.id] || 0" /></div><RouterLink class="button primary small" :to="`/courses/${course.id}`">继续学习</RouterLink></article></div></section>
      <section><div class="section-heading"><h2>实践记录</h2><RouterLink to="/labs">全部实验 →</RouterLink></div><div class="record-list"><article v-for="lab in recentLabs" :key="lab.id"><div><strong>{{ lab.title }}</strong><small>完成度 {{ store.labProgress[lab.id] || 0 }}% · {{ dataMode === 'api' ? '账号实践记录' : '本地演示记录' }}</small><ProgressBar :value="store.labProgress[lab.id] || 0" /></div><RouterLink class="button primary small" :to="`/labs/${lab.id}`">进入实验</RouterLink></article></div></section>
    </div>
    <div class="profile-two-column">
      <section class="favorites-panel"><div class="section-heading"><h2>我的收藏</h2></div><div class="compact-tabs"><button v-for="tab in ['全部', '课程', '实验', '资源', '文章']" :key="tab" type="button" :class="{ active: favoriteTab === tab }" @click="favoriteTab = tab">{{ tab }}</button></div><div v-if="favoriteItems.length" class="favorite-list"><div v-for="item in favoriteItems" :key="`${item.favoriteType}-${item.id}`"><span class="tag">{{ item.type }}</span><strong>{{ item.title }}</strong><small>收藏于 {{ item.date }}</small><button type="button" @click="store.toggleFavorite(item.favoriteType, item.id)">取消收藏</button></div></div><div v-else class="inline-empty small-empty"><p>还没有收藏内容。</p><RouterLink to="/topics">去发现课程 →</RouterLink></div></section>
      <section class="plan-card"><div class="section-heading"><h2>学习计划</h2><button class="text-link" type="button" @click="planOpen = true">创建计划 →</button></div><div v-if="store.plans.length" class="plan-list"><article v-for="plan in store.plans" :key="plan.id"><span class="tag green">{{ plan.status }}</span><h3>{{ plan.name }}</h3><p>目标日期：{{ plan.targetDate }}</p><button class="button secondary small" type="button" @click="store.togglePlan(plan.id)">{{ plan.status === '进行中' ? '标记完成' : '恢复进行中' }}</button></article></div><div v-else class="inline-empty small-empty"><p>还没有学习计划。</p></div></section>
    </div>
    <section class="profile-cta"><div><h2>你已经超过了 <em>86%</em> 的同学，继续加油！</h2><p>每一次学习、每一次解决问题的积累，都在增长你的 AI 能力。</p><RouterLink class="button primary" to="/topics">探索更多课程</RouterLink></div><div class="profile-kpis"><span><strong>18.6h</strong>本月学习时长</span><span><strong>7 个</strong>本月实验完成</span><span><strong>860 分</strong>本月成就点</span></div><div class="trophy">🏆</div></section>
  </div>
  <AppDialog v-model="editOpen" title="编辑资料"><form class="dialog-form" @submit.prevent="saveProfile"><label>昵称<input v-model="editName" required maxlength="20" autofocus /></label><label>个人介绍<textarea v-model="editBio" required rows="4" maxlength="120" /></label><button class="button primary" type="submit">保存到本地</button></form></AppDialog>
  <AppDialog v-model="settingsOpen" title="账号设置"><div class="notice">演示模式：账号安全与通知设置待统一用户服务接入。</div><button class="button secondary" type="button" disabled>设置接口待接入</button></AppDialog>
  <AppDialog v-model="planOpen" title="创建学习计划"><form class="dialog-form" @submit.prevent="createPlan"><label>计划名称<input v-model="planName" required maxlength="50" autofocus /></label><label>目标日期<input v-model="planDate" required type="date" /></label><div class="notice">{{ dataMode === 'api' ? '计划将写入学习账号，并在管理后台成长记录中可查。' : '演示计划只保存在浏览器本地。' }}</div><button class="button primary" type="submit">创建学习计划</button></form></AppDialog>
  <AppDialog :model-value="!!badgeOpen" :title="badgeOpen || '徽章详情'" @update:model-value="badgeOpen = ''"><div class="badge-detail">◆</div><p>完成对应学习与实践目标后获得。当前徽章数据为演示内容。</p></AppDialog>
</template>
