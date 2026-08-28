<script setup lang="ts">
import { computed } from 'vue'
import type { Article } from '../types'
import { useLearningStore } from '../stores/learning'
import AppDialog from './base/AppDialog.vue'
import CategoryCover from './base/CategoryCover.vue'

const props = defineProps<{ modelValue: boolean; article?: Article; missing?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const store = useLearningStore()
const favorite = computed(() => !!props.article && store.isFavorite('article', props.article.id))
</script>

<template>
  <AppDialog :model-value="modelValue" :title="article?.title || '文章详情'" @update:model-value="emit('update:modelValue', $event)">
    <template v-if="article">
      <CategoryCover :title="article.title" :variant="article.coverVariant" :icon="article.icon" />
      <div class="meta"><span>{{ article.category }}</span><span>{{ article.readMinutes }} 分钟阅读</span><span>{{ article.publishedAt }}</span></div>
      <p v-for="paragraph in article.content" :key="paragraph">{{ paragraph }}</p>
      <div class="notice">当前为前端演示文章，不代表实时新闻；资讯服务接口待接入。</div>
      <button class="button secondary" type="button" @click="store.toggleFavorite('article', article.id)">{{ favorite ? '取消收藏' : '收藏文章' }}</button>
    </template>
    <div v-else-if="missing" class="inline-empty small-empty">
      <p>没有找到这个文章 ID，请关闭后重新选择。</p>
    </div>
  </AppDialog>
</template>
