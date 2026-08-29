<script setup lang="ts">
const nav = [
  ['◉', '数据看板', '/dashboard'],
  ['⌂', '首页运营', '/homepage'],
  ['▤', '学习主题', '/themes'],
  ['▣', '课程内容', '/courses'],
  ['⬡', '实训项目', '/labs'],
  ['▱', '资源中心', '/resources'],
  ['◌', 'AI 前沿', '/articles'],
  ['▦', '挑战测评', '/challenges'],
  ['♙', '用户成长', '/growth'],
  ['⚙', '系统设置', '/settings'],
]
</script>

<template>
  <aside class="admin-sidebar">
    <RouterLink class="admin-brand" to="/dashboard">
      <span>A</span>
      <strong>AI MAKER CAMPUS<small>高校 AI 创客学习平台｜管理后台</small></strong>
    </RouterLink>
    <nav aria-label="管理导航">
      <RouterLink v-for="[icon, label, path] in nav" :key="path" :to="path"><i>{{ icon }}</i><span>{{ label }}</span></RouterLink>
    </nav>
    <div class="sidebar-note"><span>⬡</span><strong>平台持续演进</strong><small>统一数据，稳定发布</small></div>
  </aside>
</template>
