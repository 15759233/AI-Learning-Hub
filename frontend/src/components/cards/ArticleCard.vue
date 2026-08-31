<script setup lang="ts">
import { computed } from 'vue'
import { useLearningStore } from '../../stores/learning'
import type { Article } from '../../types'
import BaseContentCard from '../base/BaseContentCard.vue'
import AppIcon from '../base/AppIcon.vue'

const props = defineProps<{ article: Article }>()
const emit = defineEmits<{ open: [article: Article] }>()
const store = useLearningStore()
const favorite = computed(() => store.isFavorite('article', props.article.id))
</script>

<template>
  <BaseContentCard :title="article.title" :media="article" :cover-variant="article.coverVariant" :icon="article.icon" tag="AI 阅读">
    <span class="meta">{{ article.category }} · {{ article.readMinutes == null ? '阅读时长 —' : `${article.readMinutes} 分钟阅读` }}</span>
    <h3>{{ article.title }}</h3>
    <p>{{ article.summary }}</p>
    <div class="card-actions">
      <button class="text-link" type="button" @click="emit('open', article)">阅读文章 <AppIcon name="arrow-right" :size="15" /></button>
      <button class="icon-button" type="button" :class="{ active: favorite }" :aria-pressed="favorite" :aria-label="favorite ? `取消收藏${article.title}` : `收藏${article.title}`" @click="store.toggleFavorite('article', article.id)"><AppIcon name="bookmark" :size="18" /></button>
    </div>
  </BaseContentCard>
</template>
