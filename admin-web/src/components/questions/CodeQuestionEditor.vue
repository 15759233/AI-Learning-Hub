<script setup lang="ts">
interface Config { language?: string; starterCode?: string; expectedOutputs?: string }
const model = defineModel<Config>({ default: () => ({ language: 'python', starterCode: '', expectedOutputs: '' }) })
</script>
<template><div><label>语言<select v-model="model.language"><option>python</option><option>javascript</option><option>java</option></select></label><label>起始代码<textarea v-model="model.starterCode" rows="5" /></label><label>期望输出（每行一项）<textarea v-model="model.expectedOutputs" rows="3" /></label></div></template>
