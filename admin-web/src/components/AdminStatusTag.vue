<script setup lang="ts">
const props = defineProps<{ status: string }>()
const labels: Record<string, string> = { draft: '草稿', reviewing: '审核中', published: '已发布', archived: '已下架', active: '活跃', disabled: '停用' }
</script>

<template>
  <span class="status-tag" :class="`status-${props.status}`"><i></i>{{ labels[props.status] || props.status }}</span>
</template>
