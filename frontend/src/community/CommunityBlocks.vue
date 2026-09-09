<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CommunityContentBlock } from '@ai-learning-hub/contracts'
import CommunityImageGallery from './CommunityImageGallery.vue'
import { sanitizeRichHtml } from './coop/sanitize'
import { postTextPreview } from './postPreview'
const props = defineProps<{ blocks: CommunityContentBlock[]; compact?: boolean; post?: boolean }>()
const emit = defineEmits<{ overflow: [value: boolean] }>()
const textRoot = ref<HTMLElement>(), textMeasure = ref<HTMLElement>(), images = computed(() => props.blocks.filter((block) => block.type === 'image'))
const rich = computed(() => props.blocks.some((block) => block.type === 'rich_text'))
const preview = computed(() => props.post && props.compact ? postTextPreview(props.blocks) : { blocks: props.blocks, shortened: false })
const textBlocks = computed(() => props.post ? preview.value.blocks : rich.value ? props.blocks : props.blocks.filter((block) => block.type !== 'image'))
const grouped = computed(() => images.value.length && (props.post ? props.compact : !rich.value))
let observer: ResizeObserver | undefined
const measure = () => { if (props.compact && textRoot.value) emit('overflow', preview.value.shortened || textRoot.value.scrollHeight > textRoot.value.clientHeight + 1) }
watch([() => props.blocks, () => props.compact], async () => { await nextTick(); measure() })
onMounted(() => { observer = new ResizeObserver(measure); if (textMeasure.value) observer.observe(textMeasure.value); measure() })
watch(textMeasure, (node) => { observer?.disconnect(); if (node) observer?.observe(node); measure() })
onBeforeUnmount(() => observer?.disconnect())
</script>
<template><div class="community-content" :class="{ compact, 'post-content': post }"><div v-if="textBlocks.length" ref="textRoot" class="community-text-blocks"><div ref="textMeasure"><template v-for="(block, index) in textBlocks" :key="index"><CommunityImageGallery v-if="block.type === 'image'" :images="post ? images : [block]" :inline-index="post ? images.indexOf(block) : undefined" /><div v-else-if="block.type === 'rich_text'" class="community-rich-text" v-html="sanitizeRichHtml(block.text)" /><p v-else-if="block.type === 'paragraph'">{{ block.text }}</p><component :is="`h${Math.min(6, Math.max(1, block.level))}`" v-else-if="block.type === 'heading'" class="community-heading-block">{{ block.text }}</component><ul v-else-if="block.type === 'list' && !block.ordered"><li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li></ul><ol v-else-if="block.type === 'list'"><li v-for="(item, itemIndex) in block.items" :key="itemIndex">{{ item }}</li></ol><blockquote v-else-if="block.type === 'quote'">{{ block.text }}</blockquote><div v-else class="community-code"><small>{{ block.language || 'text' }} · 只读代码</small><pre><code>{{ block.code }}</code></pre></div></template></div></div><slot name="after-text" /><CommunityImageGallery v-if="grouped" :images="images" :compact="post && compact" /></div></template>
<style scoped>
.community-rich-text { min-width: 0; overflow-wrap: anywhere; }
.community-rich-text :deep(table) { display: block; max-width: 100%; overflow-x: auto; border-collapse: collapse; }
.community-rich-text :deep(th), .community-rich-text :deep(td) { border: 1px solid var(--amc-border); padding: 6px 10px; }
.community-rich-text :deep(pre) { overflow-x: auto; }
</style>
