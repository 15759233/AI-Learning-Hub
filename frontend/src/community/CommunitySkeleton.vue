<script setup lang="ts">withDefaults(defineProps<{ rows?: number }>(), { rows: 3 })</script>
<template><div class="community-skeleton" role="status" aria-label="正在加载"><div v-for="row in rows" :key="row" class="skeleton-card"><i /><span /><span /><span /></div></div></template>
