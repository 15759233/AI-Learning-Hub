<script setup lang="ts">
import AdminIcon from './AdminIcon.vue'

defineProps<{ title: string; description: string; action?: string }>()
defineEmits<{ action: [] }>()
</script>

<template>
  <div class="page-header">
    <div><h1>{{ title }}</h1><p>{{ description }}</p></div>
    <slot name="actions"><button v-if="action" class="admin-primary" type="button" @click="$emit('action')"><AdminIcon name="plus" :size="15" />{{ action }}</button></slot>
  </div>
</template>
