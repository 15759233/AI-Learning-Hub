<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="home-hero">
    <div><span class="eyebrow">{{ String(module.config.eyebrow || '尚未配置首页眉题') }}</span><h1>{{ String(module.config.title || '尚未配置首页标题') }}</h1><p>{{ String(module.config.subtitle || '尚未配置首页说明') }}</p><div class="hero-actions"><RouterLink class="button primary" to="/topics">开始学习</RouterLink><RouterLink class="button secondary" to="/labs">查看实训项目</RouterLink></div></div>
  </section>
</template>
