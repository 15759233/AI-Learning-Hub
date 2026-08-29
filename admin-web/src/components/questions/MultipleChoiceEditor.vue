<script setup lang="ts">
interface Config { options?: string; answers?: string }
const model = defineModel<Config>({ default: () => ({ options: 'A. \nB. \nC. ', answers: 'A,B' }) })
</script>
<template><div><label>选项（每行一项）<textarea v-model="model.options" rows="5" /></label><label>正确选项（逗号分隔）<input v-model="model.answers" placeholder="A,B" /></label></div></template>
