<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import AppIcon from '../../components/base/AppIcon.vue'
import CategoryCover from '../../components/base/CategoryCover.vue'
import { configText, itemNumber, itemPath, itemText } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module frontier-news-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', 'AI 世界') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle') }}</p></div><RouterLink to="/frontier">进入 AI 前沿 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
    <div v-if="module.items.length" class="home-frontier-grid">
      <RouterLink v-if="module.items[0]" class="home-focus-article" :to="itemPath(module.items[0])">
        <CategoryCover :title="module.items[0].title" :variant="itemText(module.items[0], 'coverVariant')" :icon="itemText(module.items[0], 'icon')" />
        <div><span class="tag orange">焦点文章</span><h3>{{ module.items[0].title }}</h3><p>{{ module.items[0].summary }}</p><small>{{ itemNumber(module.items[0], 'readMinutes') }} 分钟阅读 · {{ itemNumber(module.items[0], 'views').toLocaleString() }} 阅读</small></div>
      </RouterLink>
      <div class="article-list">
        <RouterLink v-for="item in module.items.slice(1, 5)" :key="item.slug" :to="itemPath(item)"><span class="tag">{{ itemText(item, 'category') }}</span><strong>{{ item.title }}</strong><small>{{ itemNumber(item, 'readMinutes') }} 分钟阅读</small></RouterLink>
      </div>
      <aside class="frontier-topic-card"><span class="eyebrow">专题推荐</span><h3>{{ configText(module, 'topicTitle', '本周值得了解的 AI Agent 技术') }}</h3><ol><li>工具调用与安全边界</li><li>记忆与上下文工程</li><li>任务规划与可观测性</li><li>多智能体协作</li></ol><RouterLink class="button secondary" to="/frontier">深入了解</RouterLink></aside>
    </div>
  </section>
</template>
