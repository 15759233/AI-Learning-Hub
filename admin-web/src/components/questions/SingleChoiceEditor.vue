<script setup lang="ts">
interface Config { options?: string; answer?: string }
const model = defineModel<Config>({ default: () => ({ options: 'A. \nB. ', answer: 'A' }) })
</script>
<template><div><label>选项（每行一项）<textarea v-model="model.options" rows="4" /></label><label>唯一正确选项<input v-model="model.answer" placeholder="A" /></label></div></template>
