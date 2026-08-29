<script setup lang="ts">
import type { PublicHomepageDto } from '@ai-learning-hub/contracts'
import { computed } from 'vue'
import { homepageRegistry } from './registry'
import HomepageModuleBoundary from './HomepageModuleBoundary.vue'

const props = defineProps<{ homepage: PublicHomepageDto }>()
const minimumItems = { theme_direction: 4, weekly_featured: 3, featured_labs: 3, frontier_news: 3, resource_tools: 4 } as const
const modules = computed(() => props.homepage.modules.filter((module) => {
  const minimum = minimumItems[module.moduleKey as keyof typeof minimumItems]
  if (minimum && module.items.length < minimum) return false
  if (module.moduleKey === 'hero_banner') {
    return Array.isArray(module.config.titleLines) && module.config.titleLines.length >= 2 && Boolean(module.config.subtitle)
  }
  return true
}))
</script>

<template>
  <HomepageModuleBoundary
    v-for="module in modules"
    :key="module.id"
    :component="homepageRegistry[module.moduleKey]"
    :module="module"
  />
</template>
