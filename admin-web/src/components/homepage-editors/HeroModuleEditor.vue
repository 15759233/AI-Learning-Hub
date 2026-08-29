<script setup lang="ts">
import { computed } from 'vue'
const props = defineProps<{ config: Record<string, unknown> }>()
const value = computed(() => props.config as { eyebrow?: string; titleLines?: string[]; highlightWords?: string[]; subtitle?: string; visualVariant?: string; primaryAction?: { label?: string; route?: string }; secondaryAction?: { label?: string; route?: string } })
const setLine = (index: number, text: string) => { const lines = [...(value.value.titleLines || [])]; lines[index] = text; value.value.titleLines = lines }
</script>
<template><div class="module-editor-fields"><h3>首屏内容</h3><label>眉题<input v-model="value.eyebrow" /></label><label>标题第一行<input :value="value.titleLines?.[0]" @input="setLine(0, ($event.target as HTMLInputElement).value)" /></label><label>标题第二行<input :value="value.titleLines?.[1]" @input="setLine(1, ($event.target as HTMLInputElement).value)" /></label><label>副标题<textarea v-model="value.subtitle" rows="3" /></label><label>视觉方案<input v-model="value.visualVariant" /></label><div class="editor-two"><label>主按钮文字<input v-model="value.primaryAction!.label" /></label><label>主按钮路由<input v-model="value.primaryAction!.route" /></label><label>次按钮文字<input v-model="value.secondaryAction!.label" /></label><label>次按钮路由<input v-model="value.secondaryAction!.route" /></label></div></div></template>
