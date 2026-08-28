<script setup lang="ts">
import { computed } from 'vue'
import { useLearningStore } from '../../stores/learning'
import type { ResourceItem } from '../../types'
import BaseContentCard from '../base/BaseContentCard.vue'

const props = defineProps<{ resource: ResourceItem }>()
const emit = defineEmits<{ preview: [resource: ResourceItem] }>()
const store = useLearningStore()
const favorite = computed(() => store.isFavorite('resource', props.resource.id))
</script>

<template>
  <BaseContentCard :title="resource.title" :cover-variant="resource.coverVariant" :icon="resource.icon" tag="演示资源">
    <span class="meta">{{ resource.theme }} · {{ resource.downloads.toLocaleString() }} 次下载</span>
    <h3>{{ resource.title }}</h3>
    <p>{{ resource.format }} · {{ resource.difficulty }} · 更新于 {{ resource.updatedAt }}</p>
    <div class="card-actions">
      <button class="text-link" type="button" @click="emit('preview', resource)">预览资源 →</button>
      <button class="icon-button" type="button" :aria-label="favorite ? `取消收藏${resource.title}` : `收藏${resource.title}`" @click="store.toggleFavorite('resource', resource.id)">{{ favorite ? '★' : '☆' }}</button>
    </div>
  </BaseContentCard>
</template>
