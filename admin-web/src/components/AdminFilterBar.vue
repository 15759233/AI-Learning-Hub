<script setup lang="ts">
import AdminIcon from './AdminIcon.vue'

defineProps<{ keyword: string; status: string; placeholder?: string }>()
defineEmits<{ 'update:keyword': [value: string]; 'update:status': [value: string]; reset: [] }>()
</script>

<template>
  <div class="filter-bar">
    <label class="filter-search"><AdminIcon name="search" :size="18" /><input :value="keyword" :placeholder="placeholder || '搜索名称或关键词'" @input="$emit('update:keyword', ($event.target as HTMLInputElement).value)" /></label>
    <select :value="status" @change="$emit('update:status', ($event.target as HTMLSelectElement).value)"><option value="">全部状态</option><option value="published">已发布</option><option value="draft">草稿</option><option value="archived">已下架</option></select>
    <button type="button" @click="$emit('reset')">重置</button>
    <slot />
  </div>
</template>
