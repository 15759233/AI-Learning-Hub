<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import AppIcon from '../../components/base/AppIcon.vue'
import CategoryCover from '../../components/base/CategoryCover.vue'
import ProgressBar from '../../components/ProgressBar.vue'
import { configText, itemNumber, itemPath, itemText, itemCover } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module featured-course-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '本周精选') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle') }}</p></div><RouterLink to="/topics">查看全部内容 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    <div v-if="module.items.length" class="featured-grid">
      <article v-if="module.items[0]" class="featured-course">
        <div><span class="tag orange">本周主课</span><h3>{{ module.items[0].title }}</h3><p>{{ module.items[0].summary }}</p><div class="meta"><span>{{ itemText(module.items[0], 'level') }}</span><span>{{ itemNumber(module.items[0], 'chapters') }} 章</span><span>{{ itemNumber(module.items[0], 'hours') }} 小时</span><span>{{ itemNumber(module.items[0], 'learners').toLocaleString() }} 人学习</span></div><ProgressBar :value="itemNumber(module.items[0], 'progress')" label="演示账号学习进度" /><RouterLink class="button primary" :to="itemPath(module.items[0])">开始学习</RouterLink></div>
        <CategoryCover :title="module.items[0].title" :media="itemCover(module.items[0])" :variant="itemText(module.items[0], 'coverVariant', 'llm')" :icon="itemText(module.items[0], 'icon', 'layers')" />
      </article>
      <RouterLink v-for="item in module.items.slice(1, 5)" :key="item.slug" class="featured-course-small panel" :to="itemPath(item)">
        <CategoryCover :title="item.title" :media="itemCover(item)" :variant="itemText(item, 'coverVariant')" :icon="itemText(item, 'icon')" />
        <div><span class="tag">{{ itemText(item, 'level') }}</span><h3>{{ item.title }}</h3><p>{{ item.summary }}</p><small>{{ itemNumber(item, 'hours') }} 小时 · {{ itemNumber(item, 'learners').toLocaleString() }} 人学习</small></div>
      </RouterLink>
    </div>
  </section>
</template>
