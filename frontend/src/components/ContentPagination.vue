<script setup lang="ts">
const props = defineProps<{ page: number; pageSize: number; total: number }>()
const emit = defineEmits<{ change: [page: number] }>()
const pages = () => Math.max(1, Math.ceil(props.total / props.pageSize))
</script>

<template>
  <nav v-if="total > pageSize" class="content-pagination" aria-label="内容分页">
    <button type="button" :disabled="page <= 1" @click="emit('change', page - 1)">上一页</button>
    <span>第 {{ page }} / {{ pages() }} 页 · 共 {{ total }} 条</span>
    <button type="button" :disabled="page >= pages()" @click="emit('change', page + 1)">下一页</button>
  </nav>
</template>

<style scoped>
.content-pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin: 24px 0; }
.content-pagination button { border: 1px solid var(--border-color, #dfe4ef); border-radius: 8px; background: #fff; padding: 8px 16px; cursor: pointer; }
.content-pagination button:disabled { cursor: not-allowed; opacity: .45; }
.content-pagination span { color: #667085; font-size: 14px; }
</style>
