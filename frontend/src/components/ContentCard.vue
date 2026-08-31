<script setup lang="ts">
import { computed } from 'vue'
import CategoryCover from './base/CategoryCover.vue'
import type { CoverData } from '../media/catalog'
import { useLearningStore } from '../stores/learning'
import type { FavoriteType } from '../types'
import AppIcon from './base/AppIcon.vue'

const props = withDefaults(defineProps<{
  id: string
  title: string
  description?: string
  meta?: string
  to?: string
  kind?: 'lab' | 'resource' | 'article'
  action?: string
  image?: string
  media?: CoverData
}>(), { description: '', meta: '', to: '', kind: 'article', action: '查看详情' })

const emit = defineEmits<{ action: [] }>()
const store = useLearningStore()
const favoriteType = computed<FavoriteType>(() => props.kind === 'lab' ? 'lab' : props.kind)
const favorite = computed(() => store.isFavorite(favoriteType.value, props.id))
</script>

<template>
  <article class="content-card">
    <component :is="to ? 'RouterLink' : 'div'" :to="to || undefined" class="card-cover">
      <CategoryCover :title="title" :image="image" :media="media" />
      <span class="tag">{{ kind === 'lab' ? '模拟实训' : kind === 'resource' ? '演示资源' : 'AI 阅读' }}</span>
    </component>
    <div class="card-body">
      <span class="meta">{{ meta }}</span>
      <h3>{{ title }}</h3>
      <p v-if="description">{{ description }}</p>
      <div class="card-actions">
        <RouterLink v-if="to" class="text-link" :to="to">{{ action }} <AppIcon name="arrow-right" :size="15" /></RouterLink>
        <button v-else class="text-link" type="button" @click="emit('action')">{{ action }} <AppIcon name="arrow-right" :size="15" /></button>
        <button class="icon-button" type="button" :class="{ active: favorite }" :aria-pressed="favorite" :aria-label="favorite ? `取消收藏${title}` : `收藏${title}`" @click="store.toggleFavorite(favoriteType, id)"><AppIcon name="bookmark" :size="18" /></button>
      </div>
    </div>
  </article>
</template>
