<script setup lang="ts">
import { computed } from 'vue'
import { useSessionStore } from '../stores/session'
import AdminIcon from './AdminIcon.vue'

const session = useSessionStore()
const nav = [
  ['dashboard', '数据看板', '/dashboard', 'dashboard.read'],
  ['homepage', '首页运营', '/homepage', 'homepage.read'],
  ['theme', '学习主题', '/themes', 'theme.read'],
  ['course', '课程内容', '/courses', 'course.read'],
  ['lab', '实训项目', '/labs', 'lab.read'],
  ['resource', '资源中心', '/resources', 'resource.read'],
  ['article', 'AI 前沿', '/articles', 'article.read'],
  ['challenge', '挑战测评', '/challenges', 'challenge.read'],
  ['growth-user', '用户成长', '/growth', 'growth.read'],
  ['settings', '系统设置', '/settings', 'settings.read'],
]
const visibleNav = computed(() => nav.filter((item) => session.user?.permissions.includes(item[3])))
</script>

<template>
  <aside class="admin-sidebar">
    <RouterLink class="admin-brand" to="/dashboard">
      <span>A</span>
      <strong>AI数智化学习平台<small>统一学习与运营管理后台</small></strong>
    </RouterLink>
    <nav aria-label="管理导航">
      <RouterLink v-for="[icon, label, path] in visibleNav" :key="path" :to="path"><i><AdminIcon :name="icon" :size="19" /></i><span>{{ label }}</span></RouterLink>
    </nav>
    <div class="sidebar-note"><span><AdminIcon name="lab" :size="22" /></span><strong>平台持续演进</strong><small>统一数据，稳定发布</small></div>
  </aside>
</template>
