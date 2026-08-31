<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import AppIcon from '../../components/base/AppIcon.vue'
import CategoryCover from '../../components/base/CategoryCover.vue'
import { configText, itemNumber, itemPath, itemText, itemCover } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module maker-project-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '创客项目') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle') }}</p></div><RouterLink to="/labs">查看全部项目 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    <div class="three-grid maker-projects">
      <RouterLink v-for="item in module.items.slice(0, 3)" :key="item.slug" class="project-card" :to="itemPath(item)">
        <div><span class="tag green">综合项目</span><h3>{{ item.title }}</h3><p>{{ item.summary }}</p><strong>{{ itemText(item, 'result') }}</strong><small>{{ (item.data.skills as string[] || []).join(' · ') }} · {{ itemNumber(item, 'steps') }} 步 · {{ itemNumber(item, 'durationMinutes') }} 分钟</small></div>
        <CategoryCover :title="item.title" :media="itemCover(item)" :variant="itemText(item, 'coverVariant')" :icon="itemText(item, 'icon')" />
      </RouterLink>
    </div>
  </section>
</template>
