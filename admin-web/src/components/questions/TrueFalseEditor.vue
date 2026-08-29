<script setup lang="ts">
interface Config { answer?: boolean }
const model = defineModel<Config>({ default: () => ({ answer: true }) })
</script>
<template><label>标准答案<select v-model="model.answer"><option :value="true">正确</option><option :value="false">错误</option></select></label></template>
