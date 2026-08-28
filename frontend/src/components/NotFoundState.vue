<script setup lang="ts">
withDefaults(defineProps<{ title?: string; description?: string; backTo?: string; backLabel?: string }>(), {
  title: '没有找到对应内容',
  description: '当前地址可能已失效，请返回列表重新选择。',
  backTo: '/',
  backLabel: '返回首页',
})
</script>

<template>
  <section class="not-found-state" role="status">
    <span aria-hidden="true">404</span>
    <h1>{{ title }}</h1>
    <p>{{ description }}</p>
    <RouterLink class="button primary" :to="backTo">{{ backLabel }}</RouterLink>
  </section>
</template>
