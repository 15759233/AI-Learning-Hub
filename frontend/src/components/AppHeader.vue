<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppDialog from './base/AppDialog.vue'
import AppIcon from './base/AppIcon.vue'
import { useAuthStore } from '../stores/auth'
import { useLearningStore } from '../stores/learning'
import { safeLoginRedirect } from '../community/redirect'

const router = useRouter()
const route = useRoute()
const auth = useAuthStore()
const learning = useLearningStore()
const searchOpen = ref(false)
const loginOpen = ref(false)
const navOpen = ref(false)
const query = ref('')
const loginEmail = ref('')
const loginPassword = ref('')
const navigation = [
  ['探索首页', '/'],
  ['学习主题', '/topics'],
  ['实训项目', '/labs'],
  ['资源中心', '/resources'],
  ['AI 前沿', '/frontier'],
  ['挑战与测评', '/assessments'],
]

const submitSearch = () => {
  const value = query.value.trim()
  if (!value) return
  searchOpen.value = false
  router.push({ path: '/topics', query: { q: value } })
}
const login = async () => {
  try {
    await auth.login(loginEmail.value, loginPassword.value)
    if (auth.dataMode === 'api') await learning.syncFromApi()
    loginPassword.value = ''
    loginOpen.value = false
    await router.replace(safeLoginRedirect(route.query.redirect))
  } catch { /* 登录错误由统一认证 Store 展示。 */ }
}
const logout = async () => {
  await auth.logout()
  await router.replace('/')
}
watch(() => route.query.login, (value) => { if (value === '1') loginOpen.value = true }, { immediate: true })
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/" aria-label="AI MAKER CAMPUS 首页">
        <span class="brand-mark" aria-hidden="true">A</span>
        <span><strong>AI MAKER CAMPUS</strong><small>高校 AI 创客学习平台</small></span>
      </RouterLink>
      <nav id="main-navigation" class="main-nav" :class="{ 'mobile-open': navOpen }" aria-label="主导航">
        <RouterLink v-for="[label, path] in navigation" :key="path" :to="path" @click="navOpen = false">{{ label }}</RouterLink>
        <RouterLink class="mobile-nav-cta" to="/topics" @click="navOpen = false">开始学习</RouterLink>
      </nav>
      <div class="header-actions">
        <span v-if="auth.dataMode === 'api'" class="api-mode-badge">真实 API</span>
        <button class="icon-button" type="button" aria-label="全站搜索" @click="searchOpen = true"><AppIcon name="search" :size="18" /></button>
        <RouterLink v-if="auth.user" class="avatar" to="/profile" aria-label="进入个人中心">{{ auth.user.displayName.slice(0, 1) }}</RouterLink>
        <button v-else class="button secondary small" type="button" @click="loginOpen = true">登录</button>
        <button v-if="auth.user" class="text-link" type="button" @click="logout">退出</button>
        <RouterLink class="button primary header-cta" to="/topics">开始学习</RouterLink>
        <button class="icon-button mobile-nav-toggle" type="button" :aria-expanded="navOpen" aria-controls="main-navigation" :aria-label="navOpen ? '关闭主导航' : '打开主导航'" @click="navOpen = !navOpen"><AppIcon :name="navOpen ? 'close' : 'menu'" :size="20" /></button>
      </div>
    </div>
  </header>
  <AppDialog v-model="searchOpen" title="搜索课程、主题和技能">
    <form class="dialog-form" @submit.prevent="submitSearch">
      <label class="sr-only" for="global-search">搜索内容</label>
      <input id="global-search" v-model="query" autofocus placeholder="例如：AI Agent" />
      <button class="button primary" type="submit">搜索学习内容</button>
    </form>
  </AppDialog>
  <AppDialog v-model="loginOpen" title="登录统一学习账号">
    <form class="dialog-form" @submit.prevent="login">
      <template v-if="auth.dataMode === 'api'"><label>邮箱<input v-model="loginEmail" type="email" autocomplete="username" required autofocus /></label>
      <label>密码<input v-model="loginPassword" type="password" autocomplete="current-password" minlength="8" required /></label></template><p v-else>当前是显式演示模式，不使用真实账号或服务端数据。</p>
      <p v-if="auth.error" class="answer-wrong" role="alert">{{ auth.error }}</p>
      <button class="button primary" type="submit" :disabled="auth.loading">{{ auth.loading ? '正在登录…' : auth.dataMode === 'mock' ? '进入演示社区' : '登录' }}</button>
    </form>
  </AppDialog>
</template>
