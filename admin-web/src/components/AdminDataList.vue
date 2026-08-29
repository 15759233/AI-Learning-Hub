<script setup lang="ts">
import type { CatalogItemDto } from '@ai-learning-hub/contracts'
import AdminStatusTag from './AdminStatusTag.vue'

defineProps<{ items: CatalogItemDto[]; selected?: string; icon?: string; emptyText?: string }>()
defineEmits<{ select: [item: CatalogItemDto] }>()
</script>

<template>
  <div v-if="items.length" class="data-list">
    <button v-for="item in items" :key="item.id" type="button" :class="{ selected: selected === item.id }" @click="$emit('select', item)">
      <span class="list-icon">{{ icon || '◇' }}</span>
      <div><strong>{{ item.title }}</strong><small>{{ item.summary }}</small><p><AdminStatusTag :status="item.status" /><span>更新 {{ new Date(item.updatedAt).toLocaleDateString('zh-CN') }}</span></p></div>
      <i>⋯</i>
    </button>
  </div>
  <div v-else class="admin-empty"><span>◇</span><strong>{{ emptyText || '暂无匹配内容' }}</strong><small>调整筛选条件或创建第一条内容。</small></div>
</template>
