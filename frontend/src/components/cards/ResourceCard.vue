<script setup lang="ts">
import { computed } from 'vue'
import { dataMode } from '../../services/api/client'
import { useLearningStore } from '../../stores/learning'
import type { ResourceItem } from '../../types'
import BaseContentCard from '../base/BaseContentCard.vue'
import AppIcon from '../base/AppIcon.vue'

const props = defineProps<{ resource: ResourceItem }>()
const emit = defineEmits<{ preview: [resource: ResourceItem] }>()
const store = useLearningStore()
const favorite = computed(() => store.isFavorite('resource', props.resource.id))
</script>

<template>
  <BaseContentCard :title="resource.title" :image="resource.cover" :cover-variant="resource.coverVariant" :icon="resource.icon" :tag="dataMode === 'api' ? resource.category : '演示资源'">
    <span class="meta">{{ resource.theme }} · {{ resource.downloads.toLocaleString() }} 次下载</span>
    <h3>{{ resource.title }}</h3>
    <p>{{ resource.format }} · {{ resource.difficulty }} · 更新于 {{ resource.updatedAt }}</p>
    <div class="card-actions">
      <button class="text-link" type="button" @click="emit('preview', resource)">预览资源 <AppIcon name="arrow-right" :size="15" /></button>
      <button class="icon-button" type="button" :class="{ active: favorite }" :aria-pressed="favorite" :aria-label="favorite ? `取消收藏${resource.title}` : `收藏${resource.title}`" @click="store.toggleFavorite('resource', resource.id)"><AppIcon name="bookmark" :size="18" /></button>
    </div>
  </BaseContentCard>
</template>
