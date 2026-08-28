<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const searchOpen = ref(false)
const query = ref('')
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
</script>

<template>
  <a class="skip-link" href="#main-content">跳到主要内容</a>
  <header class="app-header">
    <div class="header-inner">
      <RouterLink class="brand" to="/" aria-label="AI数智化学习平台首页">
        <span class="brand-mark" aria-hidden="true">A</span>
        <span><strong>AI数智化学习平台</strong><small>高校 AI 学习与实训</small></span>
      </RouterLink>
      <nav class="main-nav" aria-label="主导航">
        <RouterLink v-for="[label, path] in navigation" :key="path" :to="path">{{ label }}</RouterLink>
      </nav>
      <div class="header-actions">
        <button class="icon-button" type="button" aria-label="全站搜索" @click="searchOpen = true">⌕</button>
        <RouterLink class="avatar" to="/profile" aria-label="进入个人中心">梦</RouterLink>
        <RouterLink class="button primary header-cta" to="/topics">开始学习</RouterLink>
      </div>
    </div>
  </header>
  <dialog :open="searchOpen" class="search-dialog" @close="searchOpen = false">
    <form class="dialog-card" @submit.prevent="submitSearch">
      <div class="dialog-title">
        <strong>搜索课程、主题和技能</strong>
        <button class="icon-button" type="button" aria-label="关闭搜索" @click="searchOpen = false">×</button>
      </div>
      <label class="sr-only" for="global-search">搜索内容</label>
      <input id="global-search" v-model="query" autofocus placeholder="例如：AI Agent" />
      <button class="button primary" type="submit">搜索学习内容</button>
    </form>
  </dialog>
</template>
