<script setup lang="ts">
import {
  HOMEPAGE_PREVIEW_MESSAGE,
  HOMEPAGE_PREVIEW_READY_MESSAGE,
  type HomepagePreviewMessage,
  type PublicHomepageDto,
} from '@ai-learning-hub/contracts'
import { onBeforeUnmount, onMounted, ref } from 'vue'
import HomepageRenderer from '../homepage/HomepageRenderer.vue'

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

const receivePreview = (event: MessageEvent<HomepagePreviewMessage>) => {
  if (event.source !== window.parent || !allowedOrigins.has(event.origin)) return
  if (event.data?.type !== HOMEPAGE_PREVIEW_MESSAGE || !Array.isArray(event.data.homepage?.modules)) return
  homepage.value = event.data.homepage
}

onMounted(() => {
  window.addEventListener('message', receivePreview)
  if (window.parent !== window && allowedOrigins.has(parentOrigin)) {
    window.parent.postMessage({ type: HOMEPAGE_PREVIEW_READY_MESSAGE }, parentOrigin)
  }
})
onBeforeUnmount(() => window.removeEventListener('message', receivePreview))
</script>

<template>
  <div class="page-container home-page">
    <HomepageRenderer v-if="homepage" :homepage="homepage" />
    <p v-else class="empty-state">正在接收管理端首页草稿…</p>
  </div>
</template>
