<script setup lang="ts">
import { ElMessage } from 'element-plus'
import { onMounted, reactive, ref } from 'vue'
import AdminPageHeader from '../components/AdminPageHeader.vue'
import { api } from '../services/api'

interface Setting { key: string; value: unknown; sensitive: boolean }
interface School { id: string; name: string; departments: Array<{ id: string; name: string }>; _count: { users: number } }
interface SystemLog { id: string; result?: string; method?: string; path?: string; createdAt: string }
interface Notification { id: string; title: string; status: string; _count: { reads: number } }
const settings = ref<Setting[]>([])
const schools = ref<School[]>([])
const loginLogs = ref<SystemLog[]>([])
const operationLogs = ref<SystemLog[]>([])
const notifications = ref<Notification[]>([])
const notification = reactive({ title: '', content: '' })
const form = reactive<Record<string, string | number>>({
  platform_name: 'AI MAKER CAMPUS',
  platform_subtitle: '高校 AI 创客学习平台',
  upload_max_mb: 20,
  allowed_file_types: 'pdf,docx,pptx,zip,txt,png,jpg,webp',
  session_minutes: 10080,
})
onMounted(async () => {
  ;[settings.value, schools.value, loginLogs.value, operationLogs.value, notifications.value] = await Promise.all([
    api<Setting[]>('/admin/settings'),
    api<School[]>('/admin/schools'),
    api<SystemLog[]>('/admin/login-logs'),
    api<SystemLog[]>('/admin/operation-logs'),
    api<Notification[]>('/admin/notifications'),
  ])
  for (const item of settings.value) if (!item.sensitive && item.value !== null) form[item.key] = String(item.value)
})
const save = async () => {
  for (const [key, value] of Object.entries(form)) await api('/admin/settings', { method: 'PATCH', body: JSON.stringify({ key, value }) })
  ElMessage.success('系统设置已保存')
}
const createNotification = async () => {
  const created = await api<Notification>('/admin/notifications', { method: 'POST', body: JSON.stringify(notification) })
  const published = await api<Notification>(`/admin/notifications/${created.id}/publish`, { method: 'POST' })
  notifications.value.unshift({ ...published, _count: { reads: 0 } })
  Object.assign(notification, { title: '', content: '' })
  ElMessage.success('通知已发布')
}
</script>

<template>
  <AdminPageHeader title="系统设置" description="维护平台公开配置；敏感密钥只通过部署环境注入">
    <template #actions><button class="admin-primary" type="button" @click="save">保存设置</button></template>
  </AdminPageHeader>
  <div class="settings-grid">
    <section class="panel"><h2>平台基础信息</h2><form class="admin-form" @submit.prevent="save"><label>平台名称<input v-model="form.platform_name" /></label><label>平台副标题<input v-model="form.platform_subtitle" /></label><label>会话时长（分钟）<input v-model.number="form.session_minutes" type="number" min="15" /></label></form></section>
    <section class="panel"><h2>文件与存储策略</h2><form class="admin-form" @submit.prevent="save"><label>单文件上限（MB）<input v-model.number="form.upload_max_mb" type="number" min="1" max="20" /></label><label>允许的扩展名<input v-model="form.allowed_file_types" /></label><p class="settings-note">本地、MinIO 与 S3 驱动由服务部署环境选择。访问密钥不会通过本页面读取或返回。</p></form></section>
    <section class="panel"><h2>组织机构</h2><p class="settings-note">学校、院系与用户归属来自同一 PostgreSQL 数据源。</p><ul><li v-for="school in schools" :key="school.id">{{ school.name }}：{{ school.departments.map((item) => item.name).join('、') || '暂无院系' }}（{{ school._count.users }} 人）</li></ul></section>
    <section class="panel"><h2>发布平台通知</h2><form class="admin-form" @submit.prevent="createNotification"><label>通知标题<input v-model="notification.title" required maxlength="120" /></label><label>通知内容<textarea v-model="notification.content" required maxlength="2000" rows="3" /></label><button class="admin-primary" type="submit">创建并发布</button></form><p class="settings-note">已发布 {{ notifications.filter((item) => item.status === 'published').length }} 条，累计已读 {{ notifications.reduce((sum, item) => sum + item._count.reads, 0) }} 次。</p></section>
    <section class="panel"><h2>运行审计</h2><p class="settings-note">最近登录 {{ loginLogs.length }} 条，管理操作 {{ operationLogs.length }} 条；日志不展示密码、令牌或原始 IP。</p><ul><li v-for="item in operationLogs.slice(0, 4)" :key="item.id">{{ item.method }} {{ item.path }} · {{ item.result }} · {{ new Date(item.createdAt).toLocaleString('zh-CN') }}</li></ul></section>
    <section class="panel security-boundary"><h2>安全边界</h2><ul><li>JWT、数据库和对象存储密钥仅从运行环境读取。</li><li>学生端公开接口不返回题目答案与评分规则。</li><li>实训仅执行结构化白名单动作，不开放真实 Shell。</li><li>管理接口由服务端 RBAC 校验，不依赖前端菜单。</li></ul></section>
  </div>
</template>
