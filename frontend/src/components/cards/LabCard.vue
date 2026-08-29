<script setup lang="ts">
import { computed } from 'vue'
import { dataMode } from '../../services/api/client'
import { useLearningStore } from '../../stores/learning'
import type { Lab } from '../../types'
import BaseContentCard from '../base/BaseContentCard.vue'
import AppIcon from '../base/AppIcon.vue'

const props = defineProps<{ lab: Lab }>()
const store = useLearningStore()
const favorite = computed(() => store.isFavorite('lab', props.lab.id))
</script>

<template>
  <BaseContentCard :title="lab.title" :to="`/labs/${lab.id}`" :image="lab.cover" :cover-variant="lab.coverVariant" :icon="lab.icon" :tag="dataMode === 'api' ? '实训项目' : '模拟实训'">
    <span class="meta">{{ lab.category }} · {{ lab.level }} · {{ lab.minutes == null ? '时长 —' : `${lab.minutes} 分钟` }}</span>
    <h3>{{ lab.title }}</h3>
    <p>{{ lab.description }}</p>
    <div class="card-actions">
      <RouterLink class="text-link" :to="`/labs/${lab.id}`">开始实验 <AppIcon name="arrow-right" :size="15" /></RouterLink>
      <button class="icon-button" type="button" :class="{ active: favorite }" :aria-pressed="favorite" :aria-label="favorite ? `取消收藏${lab.title}` : `收藏${lab.title}`" @click="store.toggleFavorite('lab', lab.id)"><AppIcon name="bookmark" :size="18" /></button>
    </div>
  </BaseContentCard>
</template>
