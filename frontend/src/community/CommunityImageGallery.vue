<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppDialog from '../components/base/AppDialog.vue'
import { loadCommunityImage } from './imageQueue'
import { useCommunityScrollRoot } from './composables/useCommunityScrollRoot'
import { useAuthStore } from '../stores/auth'
import { useCommunityStore } from '../stores/community'
const props = defineProps<{ images: Array<{ fileId: string; alt?: string }>; editable?: boolean; compact?: boolean; inlineIndex?: number }>()
const emit = defineEmits<{ edit: [fileId: string]; remove: [fileId: string] }>()
const root = ref<HTMLElement>(), urls = ref<Record<string, string>>({}), failed = ref<string[]>([]), opened = ref(false), selected = ref(0)
const sizes = ref<Record<string, { width: number; height: number }>>({}), originalSize = ref(false), auth = useAuthStore(), store = useCommunityStore()
const shown = computed(() => props.inlineIndex === undefined ? props.images : props.images.slice(props.inlineIndex, props.inlineIndex + 1))
const singleStyle = computed(() => {
  const size = shown.value.length === 1 ? sizes.value[shown.value[0]!.fileId] : undefined
  return size ? { '--image-ratio': String(size.width / size.height), '--image-width': `${size.width}px` } : undefined
})
const isLong = (id: string) => !!sizes.value[id] && sizes.value[id]!.height > sizes.value[id]!.width * 2.4
const scrollRoot = useCommunityScrollRoot()
let epoch = 0, observer: IntersectionObserver | undefined
const clear = () => { epoch++; observer?.disconnect(); Object.values(urls.value).forEach((url) => URL.revokeObjectURL(url)); urls.value = {}; failed.value = []; sizes.value = {}; opened.value = false }
const load = async (images = shown.value) => {
  observer?.disconnect()
  const requestEpoch = epoch
  await Promise.all(images.filter((image) => !urls.value[image.fileId]).map(async (image) => {
    try { const url = await loadCommunityImage(image.fileId, () => requestEpoch === epoch); if (!url) return; if (requestEpoch === epoch) urls.value[image.fileId] = url; else URL.revokeObjectURL(url) }
    catch { if (requestEpoch === epoch) failed.value.push(image.fileId) }
  }))
}
const observe = () => {
  if (!root.value) return
  if (props.editable) { void load(); return }
  observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) void load() }, { root: scrollRoot.value, rootMargin: '300px' })
  observer.observe(root.value)
}
watch([() => props.images.map((image) => image.fileId).join(':'), () => auth.user?.id, () => store.epoch], async () => { clear(); await nextTick(); observe() })
const imageLoaded = (event: Event, id: string) => { const image = event.target as HTMLImageElement; sizes.value[id] = { width: image.naturalWidth, height: image.naturalHeight } }
const open = (index: number) => { selected.value = props.inlineIndex ?? index; originalSize.value = false; opened.value = true; if (props.inlineIndex !== undefined) void load(props.images) }
const step = (delta: number) => { selected.value = (selected.value + delta + props.images.length) % props.images.length; originalSize.value = false }
const keydown = (event: KeyboardEvent) => { if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') { event.preventDefault(); step(event.key === 'ArrowLeft' ? -1 : 1) } }
onMounted(observe)
onBeforeUnmount(clear)
</script>
<template>
  <div ref="root" :class="[ `gallery-${shown.length}`, editable ? 'composer-image-gallery' : 'community-gallery', { 'gallery-preview': compact, 'gallery-single-long': shown.length === 1 && isLong(shown[0]!.fileId) } ]" :style="editable ? undefined : singleStyle"><template v-for="(image, index) in shown" :key="image.fileId"><figure v-if="editable"><button type="button" :aria-label="`查看图片 ${index + 1}`" :disabled="!urls[image.fileId]" @click.stop="open(index)"><img v-if="urls[image.fileId]" :src="urls[image.fileId]" :alt="image.alt || '作者分享的学习图片'" /><span v-else>{{ failed.includes(image.fileId) ? '图片不可见或已失效' : '正在读取图片…' }}</span></button><figcaption><button class="text-link" type="button" :aria-label="`编辑图片 ${index + 1}`" @click="emit('edit', image.fileId)">编辑</button><button class="text-link" type="button" :aria-label="`移除图片 ${index + 1}`" @click="emit('remove', image.fileId)">移除</button></figcaption></figure><button v-else type="button" :aria-label="`查看图片 ${(inlineIndex ?? index) + 1}${isLong(image.fileId) ? '，查看长图' : ''}`" :disabled="!urls[image.fileId]" @click.stop="open(index)"><img v-if="urls[image.fileId]" :class="{ 'long-image': isLong(image.fileId) }" :src="urls[image.fileId]" :alt="image.alt || '作者分享的学习图片'" loading="lazy" @load="imageLoaded($event, image.fileId)" /><span v-else class="gallery-placeholder">{{ failed.includes(image.fileId) ? '图片不可见或已失效' : '正在读取图片…' }}</span><small v-if="compact && isLong(image.fileId)" class="gallery-long-hint">查看长图</small></button></template></div>
  <AppDialog v-model="opened" title="查看学习图片" @keydown="keydown"><section v-if="opened" class="community-image-viewer"><div class="community-image-stage" :class="{ 'image-original': originalSize, 'image-long': isLong(images[selected]!.fileId) }"><img :src="urls[images[selected]!.fileId]" :alt="images[selected]!.alt || '作者分享的学习图片'" @load="imageLoaded($event, images[selected]!.fileId)" /></div><footer><button v-if="images.length > 1" class="button secondary small" type="button" @click="step(-1)">上一张</button><span>{{ selected + 1 }} / {{ images.length }}</span><button class="button secondary small" type="button" :aria-pressed="originalSize" @click="originalSize = !originalSize">{{ originalSize ? '适应窗口' : '原始大小' }}</button><button v-if="images.length > 1" class="button secondary small" type="button" @click="step(1)">下一张</button></footer></section></AppDialog>
</template>
