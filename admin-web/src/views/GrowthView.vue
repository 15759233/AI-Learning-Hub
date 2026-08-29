<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import labCover from '../assets/lab-cover.webp'
import learningCover from '../assets/learning-cover.webp'
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
const moduleMeta: Record<string, [string, string, string]> = {
  overview: ['学习总览', '学习时长、完成课程', '◷'],
  ability_card: ['AI 能力卡', '知识与实践能力', '⬡'],
  badges: ['微章墙', '成果与荣誉', '♛'],
  recent_courses: ['最近学习课程', '课程进度与推荐', '▣'],
  lab_records: ['实验记录', '实训报告与成果', '⌁'],
  favorites: ['我的收藏', '课程、资讯与资源', '★'],
  plans: ['学习计划', '目标与进度管理', '▤'],
  growth_stats: ['成长统计', '积分、连续学习', '▥'],
}
const moduleView = (item: GrowthModule) => moduleMeta[item.id] || [item.title, '个人中心展示模块', '◇']
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
  <AdminPageHeader title="用户成长管理" description="管理用户个人中心与成长体系展示内容及规则">
    <template #actions><button class="admin-secondary" type="button">成长体系设置⌄</button><button class="admin-secondary" type="button">⇩ 数据导出</button><button class="admin-primary" type="button">＋ 新建徽章/证书</button></template>
  </AdminPageHeader>
  <div class="kpi-grid">
    <AdminKpiCard icon="♟" label="学习者总数" :value="users.length" color="#ff4d1f" />
    <AdminKpiCard icon="▣" label="学习记录" :value="growth?.progress.length || 0" color="#22b66c" />
    <AdminKpiCard icon="◇" label="实训记录" :value="growth?.runs.length || 0" color="#7c4dff" />
    <AdminKpiCard icon="▤" label="测评记录" :value="growth?.attempts.length || 0" color="#3478f6" />
  </div>
  <section class="growth-layout panel">
    <aside class="growth-modules">
      <h2>成长模块管理</h2><p>控制个人中心与成长体系各模块的展示与配置</p>
      <div v-for="item in modules" :key="item.id"><i>{{ moduleView(item)[2] }}</i><strong>{{ moduleView(item)[0] }}<small>{{ moduleView(item)[1] }}</small></strong><el-switch :model-value="item.enabled" @change="toggleModule(item, Boolean($event))" /><button type="button">管理</button></div>
      <button class="add-growth-module" type="button">＋ 添加自定义模块</button>
    </aside>
    <div class="learner-list">
      <div class="panel-heading"><div><h2>学习者列表</h2><small>查看与管理学习成长数据与展示内容</small></div><input v-model="keyword" placeholder="搜索用户名、姓名、学号、学校" /><select><option>全部学校</option></select><select><option>全部状态</option></select></div>
      <div class="learner-table-head"><span>用户</span><span>学校</span><span>成长进度</span><span>活跃状态</span><span>操作</span></div>
      <button v-for="(user, index) in filtered" :key="user.id" type="button" :class="{ selected: selected?.id === user.id }" @click="loadGrowth(user)">
        <span>{{ user.displayName.slice(0, 1) }}</span>
        <strong>{{ user.displayName }}<small>ID：{{ user.id.slice(-6) }}</small></strong>
        <em>{{ user.school?.name || ['清华大学', '北京大学', '浙江大学'][index % 3] }}</em>
        <span class="growth-progress"><i :style="{ width: `${72 - index * 7}%` }"></i><small>{{ 72 - index * 7 }}%</small></span>
        <AdminStatusTag :status="index < 3 ? 'active' : index < 5 ? 'reviewing' : 'disabled'" />
        <b>查看</b>
      </button>
    </div>
    <aside v-if="growth" class="learner-detail">
      <div class="learner-profile"><span>{{ growth.user.displayName.slice(0, 1) }}</span><div><h2>{{ growth.user.displayName }} <small>♛ Lv.28</small></h2><p>{{ growth.user.email }} · ID {{ growth.user.id.slice(-6) }}</p><AdminStatusTag :status="growth.user.status" /></div><button type="button">查看前端个人中心</button></div>
      <h3>学习数据快照</h3>
      <div class="growth-snapshot"><span><i>◷</i><b>128.6h</b>学习时长</span><span><i>▣</i><b>{{ growth.progress.length }}</b>完成课程</span><span><i>♜</i><b>{{ growth.runs.length }}</b>实训完成</span><span><i>⬡</i><b>{{ growth.achievements.length }}</b>获得徽章</span><span><i>▤</i><b>{{ growth.certificates.length }}</b>证书获得</span></div>
      <h3>获得的徽章 <small>全部（{{ Math.max(5, growth.achievements.length) }}）›</small></h3>
      <div class="badge-row"><span v-for="(name, index) in ['AI 工程实践者', '数据探索者', '创新思维之星', '编程高手', '学习坚持者']" :key="name"><i>{{ ['◆', '♛', '✦', '</>', '⬡'][index] }}</i><small>{{ name }}</small></span></div>
      <h3>学习计划 <small>全部（{{ Math.max(2, growth.plans.length) }}）›</small></h3>
      <div class="plan-card"><div><b>大模型进阶学习计划</b><AdminStatusTag status="active" /></div><small>已完成 6/12 · 进度 50%</small><i><span style="width: 50%"></span></i></div>
      <div class="plan-card"><div><b>提示词工程进阶</b><AdminStatusTag status="published" /></div><small>进度 100%</small><i><span style="width: 100%"></span></i></div>
      <h3>智能推荐 <small>管理推荐策略 →</small></h3>
      <div class="growth-recommendations"><article><img :src="learningCover" alt="" /><span><b>大模型原理与应用</b><small>课程 · 推荐优先级高</small></span></article><article><img :src="labCover" alt="" /><span><b>数据可视化分析实践</b><small>实训 · 推荐优先级中</small></span></article></div>
    </aside>
  </section>
  <section class="panel growth-quick-actions"><h2>快速操作</h2><div><button type="button">▧<span><b>编辑展示模块</b><small>拖拽排序、显示开关</small></span></button><button type="button">⌁<span><b>调整推荐</b><small>配置个性化推荐内容</small></span></button><button type="button">⬡<span><b>配置徽章</b><small>创建与管理成就徽章</small></span></button><button type="button">▤<span><b>证书规则</b><small>设置证书发放规则</small></span></button><button type="button">♙<span><b>成长积分规则</b><small>配置积分获取与消耗</small></span></button><button type="button">◉<span><b>数据同步</b><small>同步明细展示数据</small></span></button></div></section>
</template>
