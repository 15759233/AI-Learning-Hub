<script lang="ts">
const warned = new Set<string>()
</script>
<script setup lang="ts">
import { computed } from 'vue'
import { iconRegistry } from '../../../packages/catalog-assets/icons/registry'
const props = defineProps<{ name?: string; size?: number }>()
const aliases: Record<string, string> = { dashboard: 'chart', theme: 'layers', article: 'file', resource: 'folder', report: 'file', lab: 'first-lab', challenge: 'target', 'growth-user': 'users', settings: 'sliders', notification: 'bell', media: 'image' }
const controls: Record<string, string> = {
  home: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />',
  homepage: '<path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />',
  clock: '<circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" />',
  upload: '<path d="M12 16V4M7 9l5-5 5 5M4 14v6h16v-6" />',
  publish: '<path d="M12 16V4M7 9l5-5 5 5M4 14v6h16v-6" />',
  'chevron-down': '<path d="m7 9 5 5 5-5" />',
  'arrow-up': '<path d="m7 11 5-5 5 5M12 6v12" />',
  'arrow-down': '<path d="m7 13 5 5 5-5M12 18V6" />',
}
const glyph = computed(() => {
  const name = props.name || 'missing', key = Object.hasOwn(aliases, name) ? aliases[name] : name
  const value = Object.hasOwn(iconRegistry, key) ? iconRegistry[key] : Object.hasOwn(controls, name) ? controls[name] : undefined
  if (!value && !warned.has(name)) { warned.add(name); console.warn('[AdminIcon] 未注册图标：' + name) }
  return value || iconRegistry.missing
})
</script>

<template>
  <!-- 仅渲染源码白名单向量，不接受远程SVG或业务HTML。 -->
  <svg class="admin-icon" :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" aria-hidden="true" v-html="glyph" />
</template>
