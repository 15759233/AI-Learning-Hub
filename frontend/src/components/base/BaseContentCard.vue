<script setup lang="ts">
import CategoryCover from './CategoryCover.vue'
import type { CoverData } from '../../media/catalog'

withDefaults(defineProps<{
  title: string
  to?: string
  image?: string
  media?: CoverData
  coverVariant?: string
  icon?: string
  tag?: string
  compact?: boolean
}>(), { to: '', image: '', coverVariant: 'llm', icon: 'AI', tag: '', compact: false })
</script>

<template>
  <article class="content-card" :class="{ compact }">
    <component :is="to ? 'RouterLink' : 'div'" :to="to || undefined" class="card-cover">
      <CategoryCover :title="title" :variant="coverVariant" :icon="icon" :image="image" :media="media" />
      <span v-if="tag" class="tag">{{ tag }}</span>
    </component>
    <div class="card-body">
      <slot />
    </div>
  </article>
</template>
