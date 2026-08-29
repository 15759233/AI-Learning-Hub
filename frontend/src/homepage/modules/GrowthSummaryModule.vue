<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import AppIcon from '../../components/base/AppIcon.vue'
import { configArray, configText } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module growth-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '学习成长') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle', '登录后记录学习成长') }}</p></div><RouterLink to="/profile">查看个人中心 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    <div class="growth-section">
      <div class="stat-row"><article v-for="stat in configArray<{ label: string; value: string; unit: string }>(module, 'stats')" :key="stat.label"><strong>{{ stat.value }}<small>{{ stat.unit }}</small></strong><span>{{ stat.label }}</span></article></div>
      <article class="growth-radar-card"><strong>演示账号 AI 能力</strong><svg viewBox="0 0 180 160" role="img" aria-label="演示账号学习能力雷达图"><polygon points="90,14 158,54 148,132 90,150 30,126 20,54" fill="none" stroke="#ddd6ee" /><polygon points="90,32 140,62 132,118 90,134 44,116 38,62" fill="rgba(110,91,255,.22)" stroke="#6e5bff" stroke-width="3" /></svg><span>基础认知 82% · 工具应用 70%</span></article>
    </div>
  </section>
</template>
