<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '../components/base/AppIcon.vue'
import AppDialog from '../components/base/AppDialog.vue'
import { useAuthStore } from '../stores/auth'
import { useCommunityStore } from '../stores/community'
import { communityApi } from '../services/api/community'
import { communityNavigation } from '../community/labels'
import CommunityRightRail from '../community/CommunityRightRail.vue'
const auth = useAuthStore(), store = useCommunityStore(), router = useRouter()
const collapsed = ref(false), menuOpen = ref(false)
let polling: number | undefined
const loadUnread = async () => { if (document.visibilityState !== 'visible') return; const epoch = store.epoch; try { const result = await communityApi.unread(); if (epoch === store.epoch) store.unread = result.count } catch { /* 内容区保留可重试错误，不中断正在阅读的页面。 */ } }
const logout = async () => { await auth.logout(); await router.replace('/') }
onMounted(() => { void store.loadContext().catch((error: Error) => { store.error = error.message }); void loadUnread(); polling = window.setInterval(loadUnread, 60000) })
onBeforeUnmount(() => window.clearInterval(polling))
</script>
<template>
  <div class="community-shell" :class="{ 'sidebar-collapsed': collapsed }">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <aside class="community-sidebar">
      <RouterLink class="brand community-brand" to="/welcome"><span class="brand-mark">A</span><span class="nav-label"><strong>AI MAKER CAMPUS</strong><small>高校 AI 创客学习平台</small></span></RouterLink>
      <button class="sidebar-collapse icon-button" type="button" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" @click="collapsed = !collapsed"><AppIcon name="menu" :size="20" /></button>
      <nav aria-label="学习社区导航"><RouterLink v-for="item in communityNavigation.filter((item) => item.desktop)" :key="item.path" :to="item.path" :title="item.label"><AppIcon :name="item.icon" :size="21" /><span class="nav-label">{{ item.label }}</span><b v-if="item.path === '/notifications' && store.unread" class="notification-count">{{ store.unread }}</b></RouterLink></nav>
      <button class="button primary community-publish" type="button" title="发布内容" @click="store.openComposer()"><AppIcon name="plus" :size="20" /><span class="nav-label">发布内容</span></button>
      <div class="community-account"><span class="avatar">{{ auth.user?.displayName.slice(0, 1) }}</span><div class="nav-label"><strong>{{ auth.user?.displayName }}</strong><small>{{ auth.dataMode === 'mock' ? '显式演示模式' : '统一学习账号' }}</small><RouterLink :to="`/community/user/${auth.user?.username}`">个人主页与设置</RouterLink></div><button class="icon-button" type="button" aria-label="退出登录" title="退出登录" @click="logout"><AppIcon name="arrow-left" :size="18" /></button></div>
      <RouterLink class="text-link nav-label portal-link" to="/welcome">查看品牌门户</RouterLink>
    </aside>
    <header class="community-mobile-header"><RouterLink class="brand" to="/welcome"><span class="brand-mark">A</span><strong>AI MAKER CAMPUS</strong></RouterLink><button class="icon-button" aria-label="更多功能" @click="menuOpen = true"><AppIcon name="menu" /></button><button class="button primary small" @click="store.openComposer()">发布</button></header>
    <main id="main-content" class="community-main"><slot /></main>
    <CommunityRightRail />
    <nav class="community-bottom-nav" aria-label="移动主导航"><RouterLink v-for="item in communityNavigation.filter((item) => item.mobile).sort((a, b) => a.mobileOrder - b.mobileOrder)" :key="item.path" :to="item.path" :style="{ order: item.mobileOrder }"><AppIcon :name="item.icon" :size="21" /><span>{{ item.label.replace('首页', '').replace('主题', '').replace('项目', '').replace('消息', '').replace('成长', '') }}</span></RouterLink><button class="mobile-publish-button" @click="store.openComposer()"><AppIcon name="plus" :size="24" /><span>发布</span></button></nav>
    <AppDialog v-model="menuOpen" title="学习社区"><nav class="community-more"><RouterLink v-for="item in communityNavigation" :key="item.path" :to="item.path" @click="menuOpen = false">{{ item.label }}</RouterLink><RouterLink to="/welcome" @click="menuOpen = false">品牌门户</RouterLink><button class="text-link" @click="logout">退出登录</button></nav></AppDialog>
    <button class="community-floating-publish" aria-label="快捷发布" @click="store.openComposer()"><AppIcon name="plus" /></button>
  </div>
</template>
