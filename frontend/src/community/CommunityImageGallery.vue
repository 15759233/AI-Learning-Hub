<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppDialog from '../components/base/AppDialog.vue'
import { loadCommunityImage } from './imageQueue'
import { useCommunityScrollRoot } from './composables/useCommunityScrollRoot'
const props = defineProps<{ images: Array<{ fileId: string; alt?: string }> }>()
const root = ref<HTMLElement>(), urls = ref<Record<string, string>>({}), failed = ref<string[]>([]), opened = ref(false), selected = ref(0)
const scrollRoot = useCommunityScrollRoot()
let epoch = 0, observer: IntersectionObserver | undefined
const clear = () => { epoch++; observer?.disconnect(); Object.values(urls.value).forEach((url) => URL.revokeObjectURL(url)); urls.value = {}; failed.value = [] }
const load = async () => {
  observer?.disconnect()
  const requestEpoch = epoch
  await Promise.all(props.images.map(async (image) => {
    try { const url = await loadCommunityImage(image.fileId, () => requestEpoch === epoch); if (!url) return; if (requestEpoch === epoch) urls.value[image.fileId] = url; else URL.revokeObjectURL(url) }
    catch { if (requestEpoch === epoch) failed.value.push(image.fileId) }
  }))
}
const observe = () => {
  if (!root.value) return
  observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void load() }, { root: scrollRoot.value, rootMargin: '300px' })
  observer.observe(root.value)
}
watch(() => props.images.map((image) => image.fileId).join(':'), async () => { clear(); opened.value = false; await nextTick(); observe() })
const step = (delta: number) => { selected.value = (selected.value + delta + props.images.length) % props.images.length }
const keydown = (event: KeyboardEvent) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1) } }
onMounted(observe)
onBeforeUnmount(clear)
</script>
<template>
  <div ref="root" class="community-gallery" :class="`gallery-${images.length}`"><button v-for="(image, index) in images" :key="image.fileId" type="button" :aria-label="`查看图片 ${index + 1}`" :disabled="!urls[image.fileId]" @click.stop="selected = index; opened = true"><img v-if="urls[image.fileId]" :src="urls[image.fileId]" :alt="image.alt || '作者分享的学习图片'" loading="lazy" /><p v-else>{{ failed.includes(image.fileId) ? '图片不可见或已失效' : '正在读取图片…' }}</p></button></div>
  <AppDialog v-model="opened" title="查看学习图片" @keydown="keydown"><section v-if="opened" class="community-image-viewer"><img :src="urls[images[selected]!.fileId]" :alt="images[selected]!.alt || '作者分享的学习图片'" /><footer><button v-if="images.length > 1" class="button secondary small" type="button" @click="step(-1)">上一张</button><span>{{ selected + 1 }} / {{ images.length }}</span><button v-if="images.length > 1" class="button secondary small" type="button" @click="step(1)">下一张</button></footer></section></AppDialog>
</template>
