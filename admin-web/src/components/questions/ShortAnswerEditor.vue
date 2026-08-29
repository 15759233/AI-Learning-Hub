<script setup lang="ts">
interface Config { keywords?: string; mode?: 'all' | 'any' }
const model = defineModel<Config>({ default: () => ({ keywords: '', mode: 'all' }) })
</script>
<template><div><label>评分关键词（逗号分隔）<input v-model="model.keywords" /></label><label>匹配模式<select v-model="model.mode"><option value="all">全部命中</option><option value="any">任一命中</option></select></label></div></template>
