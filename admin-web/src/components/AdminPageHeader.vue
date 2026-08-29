<script setup lang="ts">
defineProps<{ title: string; description: string; action?: string }>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="page-header">
    <div><h1>{{ title }}</h1><p>{{ description }}</p></div>
    <slot name="actions"><button v-if="action" class="admin-primary" type="button" @click="$emit('action')">＋ {{ action }}</button></slot>
  </div>
</template>
