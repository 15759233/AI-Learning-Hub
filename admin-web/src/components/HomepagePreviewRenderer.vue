<script setup lang="ts">
import {
  HOMEPAGE_PREVIEW_MESSAGE,
  HOMEPAGE_PREVIEW_READY_MESSAGE,
  type HomepagePreviewMessage,
  type HomepagePreviewReadyMessage,
  type PublicHomepageDto,
} from '@ai-learning-hub/contracts'
import { nextTick, onBeforeMount, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps<{ homepage: PublicHomepageDto | null }>()
const frame = ref<HTMLIFrameElement | null>(null)
const ready = ref(false)
let resendTimer: number | undefined

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

const receiveReady = (event: MessageEvent<HomepagePreviewReadyMessage>) => {
  if (event.source !== frame.value?.contentWindow || event.origin !== previewOrigin) return
  if (event.data?.type !== HOMEPAGE_PREVIEW_READY_MESSAGE) return
  ready.value = true
  window.clearTimeout(resendTimer)
  void sendPreview()
  resendTimer = window.setTimeout(() => { void sendPreview() }, 180)
}

watch(() => props.homepage, () => { if (ready.value) void sendPreview() }, { deep: true })
onBeforeMount(() => window.addEventListener('message', receiveReady))
onBeforeUnmount(() => {
  window.removeEventListener('message', receiveReady)
  window.clearTimeout(resendTimer)
})
</script>

<template>
  <iframe
    ref="frame"
    class="homepage-student-preview"
    :src="previewUrl"
    title="学生端真实首页草稿预览"
    sandbox="allow-forms allow-same-origin allow-scripts"
  />
</template>
