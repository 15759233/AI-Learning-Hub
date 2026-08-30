<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { CommunityContentBlock } from '@ai-learning-hub/contracts'
import { communityApi } from '../services/api/community'
const props = defineProps<{ blocks: CommunityContentBlock[]; compact?: boolean }>()
const images = ref<Record<string, string>>({}), failed = ref<string[]>([])
let epoch = 0
const clear = () => { epoch++; Object.values(images.value).forEach(URL.revokeObjectURL); images.value = {} }
watch(() => props.blocks, async (blocks) => {
  clear(); failed.value = []; const requestEpoch = epoch
  for (const block of blocks) if (block.type === 'image') {
    try { const url = await communityApi.image(block.fileId); if (requestEpoch === epoch) images.value[block.fileId] = url; else URL.revokeObjectURL(url) } catch { if (requestEpoch === epoch) failed.value.push(block.fileId) }
  }
}, { immediate: true })
onBeforeUnmount(clear)
</script>
<template><div class="community-content" :class="{ compact }"><template v-for="(block, index) in blocks" :key="index"><p v-if="block.type === 'paragraph'">{{ block.text }}</p><blockquote v-else-if="block.type === 'quote'">{{ block.text }}</blockquote><div v-else-if="block.type === 'code'" class="community-code"><small>{{ block.language || 'text' }} · 只读代码</small><pre><code>{{ block.code }}</code></pre></div><figure v-else><img v-if="images[block.fileId]" :src="images[block.fileId]" :alt="block.alt || '作者分享的学习图片'" loading="lazy" /><p v-else>{{ failed.includes(block.fileId) ? '图片不可见或已失效' : '正在读取图片…' }}</p></figure></template></div></template>
