<script setup lang="ts">
defineProps<{ active?: boolean; pending?: boolean; label?: string }>()
defineEmits<{ click: [] }>()
</script>
<template><button class="follow-button" type="button" :aria-label="label" :aria-pressed="!!active" :disabled="pending" @click="$emit('click')">{{ active ? '已关注' : '关注' }}</button></template>
