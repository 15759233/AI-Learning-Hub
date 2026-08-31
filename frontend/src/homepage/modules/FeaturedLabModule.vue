<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import AppIcon from '../../components/base/AppIcon.vue'
import CategoryCover from '../../components/base/CategoryCover.vue'
import { configText, itemNumber, itemPath, itemText, itemCover } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module featured-lab-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '模拟实训') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle') }}</p></div><RouterLink to="/labs">查看全部实验 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    <div class="four-grid numbered-labs">
      <article v-for="(item, index) in module.items.slice(0, 4)" :key="item.slug">
        <header><strong>{{ String(index + 1).padStart(2, '0') }}</strong><h3>{{ item.title }}</h3></header>
        <CategoryCover :title="item.title" :media="itemCover(item)" :variant="itemText(item, 'coverVariant')" :icon="itemText(item, 'icon')" />
        <div class="meta"><span>{{ itemText(item, 'level') }}</span><span>{{ itemNumber(item, 'durationMinutes') }} 分钟</span><span>{{ itemNumber(item, 'steps') }} 步</span></div>
        <p>{{ item.summary }}</p><small>完成率 {{ itemNumber(item, 'completionRate') }}% · {{ itemNumber(item, 'participants').toLocaleString() }} 人参与</small>
        <RouterLink class="text-link" :to="itemPath(item)">开始实验 <AppIcon name="arrow-right" :size="15" /></RouterLink>
      </article>
    </div>
  </section>
</template>
