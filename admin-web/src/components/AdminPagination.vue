<script setup lang="ts">
defineProps<{ page: number; total: number; pageSize: number }>()
defineEmits<{ change: [page: number] }>()
</script>

<template>
  <div class="admin-pagination"><span>共 {{ total }} 条</span><button type="button" :disabled="page <= 1" @click="$emit('change', page - 1)">‹</button><b>{{ page }}</b><button type="button" :disabled="page * pageSize >= total" @click="$emit('change', page + 1)">›</button><small>{{ pageSize }} 条/页</small></div>
</template>
