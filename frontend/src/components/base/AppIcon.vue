<script setup lang="ts">
import { computed, watch } from 'vue'
import { iconRegistry } from '@ai-learning-hub/catalog-assets/icons/registry'

const props = defineProps<{ name?: string; size?: number }>()
const body = computed(() => props.name && Object.hasOwn(iconRegistry, props.name) ? iconRegistry[props.name] : iconRegistry.missing)
watch(() => props.name, (name) => {
  if (import.meta.env.DEV && name && !Object.hasOwn(iconRegistry, name)) console.warn(`[AppIcon] 未知图标：${name}`)
}, { immediate: true })
</script>

<template>
  <!-- 仅渲染随源码发布并经安全校验的静态矢量注册表，不接收外部SVG。 -->
  <svg class="app-icon" :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" aria-hidden="true" v-html="body" />
</template>
