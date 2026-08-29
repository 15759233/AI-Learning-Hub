<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'

defineProps<{ module: PublicHomepageModuleDto; eyebrow?: string }>()
const path = (type: string, slug: string) => ({
  theme: '/topics',
  course: `/courses/${slug}`,
  lab: `/labs/${slug}`,
  resource: `/resources?preview=${slug}`,
  article: `/frontier?article=${slug}`,
  challenge: '/assessments',
}[type] || '/')
</script>

<template>
  <section class="homepage-module">
    <div class="section-heading"><div><span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span><h2>{{ module.name }}</h2></div></div>
    <div v-if="module.items.length" class="four-grid">
      <RouterLink v-for="item in module.items" :key="`${item.targetType}-${item.slug}`" class="panel homepage-item" :to="path(item.targetType, item.slug)">
        <span class="tag">{{ item.targetType }}</span><h3>{{ item.title }}</h3><p>{{ item.summary }}</p><small>查看详情 →</small>
      </RouterLink>
    </div>
    <p v-else class="inline-empty">尚未配置推荐内容</p>
  </section>
</template>
