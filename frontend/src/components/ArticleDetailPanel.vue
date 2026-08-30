<script setup lang="ts">
import { computed } from 'vue'
import { dataMode } from '../services/api/client'
import type { Article } from '../types'
import { useLearningStore } from '../stores/learning'
import AppDialog from './base/AppDialog.vue'
import CategoryCover from './base/CategoryCover.vue'
import { useCommunityStore } from '../stores/community'
import { useRequireAuth } from '../composables/useRequireAuth'
const requireAuth = useRequireAuth()

const props = defineProps<{ modelValue: boolean; article?: Article; missing?: boolean }>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const store = useLearningStore()
const favorite = computed(() => !!props.article && store.isFavorite('article', props.article.id))
const discuss = () => requireAuth({ reason: '登录后可参与文章讨论', action: () => { if (!props.article) return; const article = props.article; emit('update:modelValue', false); useCommunityStore().openComposer({ type: 'frontier_discussion', title: `读《${article.title}》`, contentBlocks: [{ type: 'paragraph', text: `关于《${article.title}》，我的观点是：` }], bindings: [{ type: 'article', id: article.id }] }) } })
</script>

<template>
  <AppDialog :model-value="modelValue" :title="article?.title || '文章详情'" @update:model-value="emit('update:modelValue', $event)">
    <template v-if="article">
      <CategoryCover :title="article.title" :variant="article.coverVariant" :icon="article.icon" />
      <div class="meta"><span>{{ article.category }}</span><span>{{ article.readMinutes }} 分钟阅读</span><span>{{ article.publishedAt }}</span></div>
      <p v-for="paragraph in article.content" :key="paragraph">{{ paragraph }}</p>
      <div v-if="dataMode === 'mock'" class="notice">当前为前端演示文章，不代表实时新闻。</div>
      <div v-else-if="!article.content.length" class="notice">文章正文尚未配置。</div>
      <button class="button secondary" type="button" @click="store.toggleFavorite('article', article.id)">{{ favorite ? '取消收藏' : '收藏文章' }}</button>
      <button class="button primary" type="button" @click="discuss">参与社区讨论</button><RouterLink class="text-link" :to="`/community/search?bindingId=${article.id}`" @click="emit('update:modelValue', false)">查看相关讨论</RouterLink>
    </template>
    <div v-else-if="missing" class="inline-empty small-empty">
      <p>没有找到这个文章 ID，请关闭后重新选择。</p>
    </div>
  </AppDialog>
</template>
