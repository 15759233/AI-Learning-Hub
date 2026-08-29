<script setup lang="ts">
defineProps<{ icon: string; label: string; value: string | number; color?: string; change?: string }>()
</script>

<template>
  <article class="kpi-card"><span :style="{ '--kpi': color || '#ff4d1f' }">{{ icon }}</span><div><small>{{ label }}</small><strong>{{ value }}</strong><p v-if="change">较上周 <b>↑ {{ change }}</b></p></div></article>
</template>
