<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '../stores/session'

const session = useSessionStore()
const router = useRouter()
const search = ref('')

const submit = () => {
  if (search.value.trim()) router.push({ path: '/courses', query: { keyword: search.value.trim() } })
}
const logout = async () => {
  await session.logout()
  router.replace('/login')
}
</script>

<template>
  <header class="admin-header">
    <form role="search" @submit.prevent="submit"><span>⌕</span><input v-model="search" placeholder="搜索用户、课程、项目、资源等…" /></form>
    <div class="header-env"><b></b>开发测试</div>
    <button class="header-bell" type="button" aria-label="通知">♧<sup>3</sup></button>
    <el-dropdown>
      <button class="admin-user" type="button"><span>{{ session.user?.displayName.slice(0, 1) }}</span><strong>{{ session.user?.displayName }}<small>管理员</small></strong>⌄</button>
      <template #dropdown><el-dropdown-menu><el-dropdown-item @click="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
    </el-dropdown>
    <el-dropdown>
      <button class="quick-create" type="button">＋ 快速创建⌄</button>
      <template #dropdown><el-dropdown-menu><el-dropdown-item @click="router.push('/themes')">新建主题</el-dropdown-item><el-dropdown-item @click="router.push('/courses')">新建课程</el-dropdown-item><el-dropdown-item @click="router.push('/labs')">新建实训</el-dropdown-item><el-dropdown-item @click="router.push('/resources')">上传资源</el-dropdown-item></el-dropdown-menu></template>
    </el-dropdown>
  </header>
</template>
