<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AdminKpiCard from '../components/AdminKpiCard.vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import AdminStatusTag from '../components/AdminStatusTag.vue'
import { api } from '../services/api'

interface UserRow { id: string; displayName: string; email: string; status: string; lastLoginAt: string | null; createdAt: string; school?: { name: string }; department?: { name: string } }
interface GrowthModule { id: string; title: string; enabled: boolean }
interface Growth { user: UserRow; points: number; progress: unknown[]; runs: unknown[]; attempts: Array<{ score: number }>; favorites: unknown[]; plans: unknown[]; achievements: unknown[]; certificates: unknown[]; wrongQuestions: unknown[]; knowledgeStats: unknown[] }
const users = ref<UserRow[]>([])
const modules = ref<GrowthModule[]>([])
const selected = ref<UserRow | null>(null)
const growth = ref<Growth | null>(null)
const keyword = ref('')
const filtered = computed(() => users.value.filter((item) => `${item.displayName}${item.email}`.toLowerCase().includes(keyword.value.toLowerCase())))
const loadGrowth = async (user: UserRow) => { selected.value = user; growth.value = await api(`/admin/users/${user.id}/growth`) }
const toggleModule = async (item: GrowthModule, enabled: boolean) => {
  await api(`/admin/growth/modules/${item.id}`, { method: 'PATCH', body: JSON.stringify({ enabled }) })
  item.enabled = enabled
}
onMounted(async () => {
  ;[users.value, modules.value] = await Promise.all([api<UserRow[]>('/admin/users'), api<GrowthModule[]>('/admin/growth/modules')])
  if (users.value[0]) await loadGrowth(users.value[0])
})
</script>

<template>
  <AdminPageHeader title="用户成长管理" description="查看真实学习记录、实训、测评、计划与收藏数据" />
  <div class="kpi-grid">
    <AdminKpiCard icon="♟" label="学习者总数" :value="users.length" color="#ff4d1f" />
    <AdminKpiCard icon="▣" label="学习记录" :value="growth?.progress.length || 0" color="#22b66c" />
    <AdminKpiCard icon="◇" label="实训记录" :value="growth?.runs.length || 0" color="#7c4dff" />
    <AdminKpiCard icon="▤" label="测评记录" :value="growth?.attempts.length || 0" color="#3478f6" />
  </div>
  <section class="growth-layout panel">
    <aside class="growth-modules"><h2>成长模块管理</h2><div v-for="item in modules" :key="item.id"><i>◇</i><strong>{{ item.title }}</strong><el-switch :model-value="item.enabled" @change="toggleModule(item, Boolean($event))" /></div></aside>
    <div class="learner-list"><div class="panel-heading"><h2>学习者列表</h2><input v-model="keyword" placeholder="搜索姓名或邮箱" /></div><button v-for="user in filtered" :key="user.id" type="button" :class="{ selected: selected?.id === user.id }" @click="loadGrowth(user)"><span>{{ user.displayName.slice(0, 1) }}</span><strong>{{ user.displayName }}<small>{{ user.email }}<template v-if="user.school"> · {{ user.school.name }}<template v-if="user.department">/{{ user.department.name }}</template></template></small></strong><AdminStatusTag :status="user.status" /><i>查看</i></button></div>
    <aside v-if="growth" class="learner-detail"><div class="learner-profile"><span>{{ growth.user.displayName.slice(0, 1) }}</span><div><h2>{{ growth.user.displayName }}</h2><p>{{ growth.user.email }}</p><AdminStatusTag :status="growth.user.status" /></div></div><h3>学习数据快照</h3><div class="growth-snapshot"><span><b>{{ growth.points }}</b>成长积分</span><span><b>{{ growth.progress.length }}</b>课程记录</span><span><b>{{ growth.runs.length }}</b>实训运行</span><span><b>{{ growth.favorites.length }}</b>收藏</span><span><b>{{ growth.achievements.length }}</b>徽章</span><span><b>{{ growth.certificates.length }}</b>证书</span></div><h3>测评成绩</h3><p v-if="growth.attempts.length">最近成绩 {{ growth.attempts[0].score }} 分，共 {{ growth.attempts.length }} 次提交；错题 {{ growth.wrongQuestions.length }}，知识点统计 {{ growth.knowledgeStats.length }} 条。</p><p v-else>尚无测评提交记录。</p><h3>学习计划</h3><p>{{ growth.plans.length ? `当前共有 ${growth.plans.length} 个学习计划。` : '尚未创建学习计划。' }}</p></aside>
  </section>
</template>
