<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import { coverFrames, focalPosition, type CoverData } from '../../media/catalog'
const props = withDefaults(defineProps<{
  title: string
  variant?: string
  icon?: string
  image?: string
  media?: CoverData
  label?: string
  showOverlayTitle?: boolean
  eager?: boolean
  decorative?: boolean
  ratio?: string
}>(), { variant: 'generic', icon: 'missing', image: '', label: '', ratio: '16 / 9' })
const failed = ref<string[]>([])
const frames = computed(() => coverFrames(props.media, props.image, `${props.title}封面`))
const current = computed(() => frames.value.find((frame) => !failed.value.includes(frame.url)))
watch(() => frames.value.map((frame) => frame.url).join('\n'), () => { failed.value = [] })
const onError = (event: Event) => {
  const url = (event.target as HTMLImageElement).getAttribute('src')
  if (url && !failed.value.includes(url)) failed.value.push(url)
}
</script>

<template>
  <div class="category-cover" :class="{ 'has-image': !!current, 'cover-overlay': showOverlayTitle }" :style="{ aspectRatio: ratio }">
    <img v-if="current" :key="current.url" :src="current.url" :alt="decorative ? '' : current.alt" :width="current.width" :height="current.height" :loading="eager ? 'eager' : 'lazy'" decoding="async" :style="{ objectPosition: focalPosition(current.focalPoint) }" @error="onError" />
    <div v-else class="cover-unavailable" role="img" :aria-label="decorative ? undefined : `${label || '内容'}封面暂不可用`"><AppIcon :name="icon" :size="28" /><span>{{ label || '内容' }}</span></div>
    <span v-if="label && current" class="cover-label">{{ label }}</span>
    <small v-if="showOverlayTitle">{{ title }}</small>
  </div>
</template>
