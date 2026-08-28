<script setup lang="ts">
import { computed } from 'vue'
import { useLearningStore } from '../../stores/learning'
import type { Article } from '../../types'
import BaseContentCard from '../base/BaseContentCard.vue'

const props = defineProps<{ article: Article }>()
const emit = defineEmits<{ open: [article: Article] }>()
const store = useLearningStore()
const favorite = computed(() => store.isFavorite('article', props.article.id))
</script>

<template>
  <BaseContentCard :title="article.title" :cover-variant="article.coverVariant" :icon="article.icon" tag="AI 阅读">
    <span class="meta">{{ article.category }} · {{ article.readMinutes }} 分钟阅读</span>
    <h3>{{ article.title }}</h3>
    <p>{{ article.summary }}</p>
    <div class="card-actions">
      <button class="text-link" type="button" @click="emit('open', article)">阅读文章 →</button>
      <button class="icon-button" type="button" :aria-label="favorite ? `取消收藏${article.title}` : `收藏${article.title}`" @click="store.toggleFavorite('article', article.id)">{{ favorite ? '★' : '☆' }}</button>
    </div>
  </BaseContentCard>
</template>
