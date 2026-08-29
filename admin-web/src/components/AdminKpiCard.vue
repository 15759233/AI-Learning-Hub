<script setup lang="ts">
import AdminIcon from './AdminIcon.vue'

defineProps<{ icon: string; label: string; value: string | number; color?: string; change?: string }>()
</script>

<template>
  <article class="kpi-card"><span :style="{ '--kpi': color || '#ff4d1f' }"><AdminIcon :name="icon" :size="22" /></span><div><small>{{ label }}</small><strong>{{ value }}</strong><p v-if="change">较上期 <b>{{ change }}</b></p></div></article>
</template>
