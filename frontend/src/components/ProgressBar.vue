<script setup lang="ts">
defineProps<{ value: number; label?: string; dark?: boolean }>()
</script>

<template>
  <div class="progress-wrap" :class="{ dark }">
    <div v-if="label" class="progress-label"><span>{{ label }}</span><strong>{{ value }}%</strong></div>
    <div class="progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" :aria-valuenow="value">
      <span :style="{ width: `${value}%` }" />
    </div>
  </div>
</template>
