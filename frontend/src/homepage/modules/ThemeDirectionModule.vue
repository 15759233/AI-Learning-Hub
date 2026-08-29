<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import AppIcon from '../../components/base/AppIcon.vue'
import { configText, itemNumber, itemPath, itemText } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module theme-direction-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '主题导航') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle') }}</p></div><RouterLink to="/topics">查看全部主题 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    <div class="direction-grid">
      <RouterLink v-for="item in module.items" :key="item.slug" :to="itemPath(item)" :class="`cover-${itemText(item, 'coverVariant', item.slug)}`">
        <span class="direction-icon"><AppIcon :name="itemText(item, 'icon', item.slug)" :size="24" /></span>
        <strong>{{ item.title }}</strong><p>{{ item.summary }}</p>
        <small>{{ itemNumber(item, 'courseCount') }} 门课程 · {{ itemNumber(item, 'learners').toLocaleString() }} 人学习 · {{ itemNumber(item, 'hours') }} 小时</small>
        <span>进入主题 <AppIcon name="arrow-right" :size="15" /></span>
      </RouterLink>
    </div>
  </section>
</template>
