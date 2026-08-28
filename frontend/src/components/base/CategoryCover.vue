<script setup lang="ts">
withDefaults(defineProps<{
  title: string
  variant?: string
  icon?: string
  image?: string
}>(), { variant: 'llm', icon: 'AI', image: '' })
</script>

<template>
  <div class="category-cover" :class="`cover-${variant}`" :aria-label="`${title}分类封面`" role="img">
    <img v-if="image" :src="image" alt="" loading="lazy" />
    <span v-else class="cover-grid" aria-hidden="true" />
    <strong>{{ icon }}</strong>
    <small>{{ title }}</small>
  </div>
</template>
