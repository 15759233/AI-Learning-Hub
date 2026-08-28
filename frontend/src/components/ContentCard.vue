<script setup lang="ts">
import { computed } from 'vue'
import { assets } from '../data/mock'
import { useLearningStore } from '../stores/learning'
import type { FavoriteType } from '../types'

const props = withDefaults(defineProps<{
  id: string
  title: string
  description?: string
  meta?: string
  to?: string
  kind?: 'lab' | 'resource' | 'article'
  action?: string
  image?: string
}>(), { description: '', meta: '', to: '', kind: 'article', action: '查看详情' })

const emit = defineEmits<{ action: [] }>()
const store = useLearningStore()
const favoriteType = computed<FavoriteType>(() => props.kind === 'lab' ? 'lab' : props.kind)
const favorite = computed(() => store.isFavorite(favoriteType.value, props.id))
const cover = computed(() => props.image || (props.kind === 'lab' ? assets.labCover : assets.learningCover))
</script>

<template>
  <article class="content-card">
    <component :is="to ? 'RouterLink' : 'div'" :to="to || undefined" class="card-cover">
      <img :src="cover" :alt="`${title}封面`" loading="lazy" />
      <span class="tag">{{ kind === 'lab' ? '模拟实训' : kind === 'resource' ? '演示资源' : 'AI 阅读' }}</span>
    </component>
    <div class="card-body">
      <span class="meta">{{ meta }}</span>
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
      <div class="card-actions">
        <RouterLink v-if="to" class="text-link" :to="to">{{ action }} →</RouterLink>
        <button v-else class="text-link" type="button" @click="emit('action')">{{ action }} →</button>
        <button class="icon-button" type="button" :aria-label="favorite ? `取消收藏${title}` : `收藏${title}`" @click="store.toggleFavorite(favoriteType, id)">{{ favorite ? '★' : '☆' }}</button>
      </div>
    </div>
  </article>
</template>
