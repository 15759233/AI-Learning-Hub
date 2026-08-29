<script setup lang="ts">
import {
  HOMEPAGE_PREVIEW_MESSAGE,
  HOMEPAGE_PREVIEW_READY_MESSAGE,
  HOMEPAGE_PREVIEW_SIZE_MESSAGE,
  type HomepagePreviewMessage,
  type HomepagePreviewReadyMessage,
  type HomepagePreviewSizeMessage,
  type PublicHomepageDto,
} from '@ai-learning-hub/contracts'
import { computed, nextTick, onBeforeMount, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ homepage: PublicHomepageDto | null }>()
const frame = ref<HTMLIFrameElement | null>(null)
const shell = ref<HTMLElement | null>(null)
const ready = ref(false)
const mode = ref<'desktop' | 'tablet' | 'mobile'>('desktop')
const shellWidth = ref(0)
const contentHeight = ref(1080)
const viewportWidths = { desktop: 1440, tablet: 1024, mobile: 390 } as const
const viewportWidth = computed(() => viewportWidths[mode.value])
const scale = computed(() => Math.min(1, shellWidth.value / viewportWidth.value))
const canvasStyle = computed(() => ({ height: `${Math.max(540, contentHeight.value * scale.value)}px` }))
const frameStyle = computed(() => ({
  width: `${viewportWidth.value}px`,
  height: `${contentHeight.value}px`,
  transform: `scale(${scale.value})`,
}))
let resendTimer: number | undefined
let resizeObserver: ResizeObserver | undefined

const defaultPreviewUrl = () => {
  const url = new URL(window.location.href)
  const pairedPorts: Record<string, string> = { '5174': '5173', '4174': '4173', '8081': '8080' }
  if (pairedPorts[url.port]) url.port = pairedPorts[url.port]
  url.pathname = '/__homepage-preview'
  url.search = ''
  url.hash = ''
  return url.toString()
}
const previewUrl = String(import.meta.env.VITE_STUDENT_PREVIEW_URL || defaultPreviewUrl())
const previewOrigin = new URL(previewUrl, window.location.href).origin

const sendPreview = async () => {
  if (!ready.value || !props.homepage) return
  await nextTick()
  const message: HomepagePreviewMessage = {
    type: HOMEPAGE_PREVIEW_MESSAGE,
    homepage: JSON.parse(JSON.stringify(props.homepage)) as PublicHomepageDto,
  }
  frame.value?.contentWindow?.postMessage(message, previewOrigin)
}

const receiveReady = (event: MessageEvent<HomepagePreviewReadyMessage | HomepagePreviewSizeMessage>) => {
  if (event.source !== frame.value?.contentWindow || event.origin !== previewOrigin) return
  if (event.data?.type === HOMEPAGE_PREVIEW_SIZE_MESSAGE) {
    contentHeight.value = Math.max(540, event.data.height)
    return
  }
  if (event.data?.type !== HOMEPAGE_PREVIEW_READY_MESSAGE) return
  ready.value = true
  window.clearTimeout(resendTimer)
  void sendPreview()
  resendTimer = window.setTimeout(() => { void sendPreview() }, 180)
}

watch(() => props.homepage, () => { if (ready.value) void sendPreview() }, { deep: true })
watch(mode, async () => {
  contentHeight.value = 1080
  await nextTick()
  await sendPreview()
})
onBeforeMount(() => window.addEventListener('message', receiveReady))
onMounted(() => {
  resizeObserver = new ResizeObserver(([entry]) => { shellWidth.value = entry?.contentRect.width || 0 })
  if (shell.value) resizeObserver.observe(shell.value)
})
onBeforeUnmount(() => {
  window.removeEventListener('message', receiveReady)
  window.clearTimeout(resendTimer)
  resizeObserver?.disconnect()
})
</script>

<template>
  <div class="preview-device-toolbar" role="group" aria-label="预览尺寸">
    <button v-for="value in ['desktop', 'tablet', 'mobile'] as const" :key="value" type="button" :class="{ active: mode === value }" @click="mode = value">{{ { desktop: 'Desktop 1440', tablet: 'Tablet 1024', mobile: 'Mobile 390' }[value] }}</button>
    <span>缩放 {{ Math.round(scale * 100) }}%</span>
  </div>
  <div ref="shell" class="homepage-preview-shell" :style="canvasStyle">
    <iframe
      ref="frame"
      class="homepage-student-preview"
      :style="frameStyle"
      :src="previewUrl"
      title="学生端真实首页草稿预览"
      sandbox="allow-forms allow-same-origin allow-scripts"
    />
  </div>
</template>
