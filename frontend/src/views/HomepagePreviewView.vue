<script setup lang="ts">
import {
  HOMEPAGE_PREVIEW_MESSAGE,
  HOMEPAGE_PREVIEW_READY_MESSAGE,
  HOMEPAGE_PREVIEW_SIZE_MESSAGE,
  type HomepagePreviewMessage,
  type PublicHomepageDto,
} from '@ai-learning-hub/contracts'
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import LandingRenderer from '../landing/LandingRenderer.vue'
import HomepageSkeleton from '../homepage/HomepageSkeleton.vue'

const homepage = ref<PublicHomepageDto | null>(null)
const configuredOrigins = String(import.meta.env.VITE_ADMIN_PREVIEW_ORIGINS || '')
  .split(',')
  .map((item) => item.trim())
  .filter(Boolean)
const localAdminOrigins = ['5174', '4174', '8081'].map((port) => `${window.location.protocol}//${window.location.hostname}:${port}`)
const allowedOrigins = new Set([window.location.origin, ...localAdminOrigins, ...configuredOrigins])
const parentOrigin = (() => {
  try {
    return document.referrer ? new URL(document.referrer).origin : window.location.origin
  } catch {
    return ''
  }
})()
let sizeObserver: ResizeObserver | undefined
const sendSize = () => {
  if (window.parent === window || !allowedOrigins.has(parentOrigin)) return
  window.parent.postMessage({
    type: HOMEPAGE_PREVIEW_SIZE_MESSAGE,
    width: document.documentElement.scrollWidth,
    height: document.documentElement.scrollHeight,
  }, parentOrigin)
}

const receivePreview = (event: MessageEvent<HomepagePreviewMessage>) => {
  if (event.source !== window.parent || !allowedOrigins.has(event.origin)) return
  if (event.data?.type !== HOMEPAGE_PREVIEW_MESSAGE || !Array.isArray(event.data.homepage?.modules)) return
  homepage.value = event.data.homepage
  void nextTick(sendSize)
}

onMounted(() => {
  window.addEventListener('message', receivePreview)
  if (window.parent !== window && allowedOrigins.has(parentOrigin)) {
    window.parent.postMessage({ type: HOMEPAGE_PREVIEW_READY_MESSAGE }, parentOrigin)
    sizeObserver = new ResizeObserver(sendSize)
    sizeObserver.observe(document.documentElement)
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('message', receivePreview)
  sizeObserver?.disconnect()
})
</script>

<template>
  <div class="landing-preview">
    <LandingRenderer v-if="homepage" :homepage="homepage" preview />
    <HomepageSkeleton v-else />
  </div>
</template>
