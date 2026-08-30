<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PublicLayout from './layouts/PublicLayout.vue'
import CommunityLayout from './layouts/CommunityLayout.vue'
import ImmersiveLabLayout from './layouts/ImmersiveLabLayout.vue'
import PageState from './components/PageState.vue'
import QuizBridgeDialog from './components/QuizBridgeDialog.vue'
import { AUTH_SESSION_CLEARED_EVENT, dataMode } from './services/api/client'
import { useAuthStore } from './stores/auth'
import { useLearningStore } from './stores/learning'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const learning = useLearningStore()
const bridgeMessage = ref('')
const apiState = ref<'loading' | 'success' | 'error'>('success')
const apiMessage = ref('')
let hideTimer: number | undefined

const viewState = computed(() => {
  if (apiState.value !== 'success') return apiState.value
  const value = String(route.query.state || 'success')
  return ['loading', 'empty', 'error'].includes(value) ? value : 'success'
})

const showBridgeNotice = (event: Event) => {
  bridgeMessage.value = (event as CustomEvent<{ message: string }>).detail.message
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { bridgeMessage.value = '' }, 4600)
}

const loadApi = async () => {
  if (dataMode !== 'api') return
  try {
    await auth.restore()
    if (auth.user) await learning.syncFromApi()
  } catch (error) {
    bridgeMessage.value = error instanceof Error ? error.message : '会话恢复失败'
  }
}

const showApiError = (event: Event) => {
  bridgeMessage.value = (event as CustomEvent<{ message: string }>).detail.message
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { bridgeMessage.value = '' }, 4600)
}

const clearApiSession = () => auth.clearSession()
const layout = computed(() => route.meta.layout === 'immersive' ? ImmersiveLabLayout : route.meta.layout === 'community' ? CommunityLayout : PublicLayout)

const retry = () => {
  if (apiState.value === 'error') {
    void loadApi()
    return
  }
  const query = { ...route.query }
  delete query.state
  router.replace({ query })
}

onMounted(() => {
  window.addEventListener('quiz-bridge', showBridgeNotice)
  window.addEventListener('api-error', showApiError)
  window.addEventListener(AUTH_SESSION_CLEARED_EVENT, clearApiSession)
  void loadApi()
})
onBeforeUnmount(() => {
  window.removeEventListener('quiz-bridge', showBridgeNotice)
  window.removeEventListener('api-error', showApiError)
  window.removeEventListener(AUTH_SESSION_CLEARED_EVENT, clearApiSession)
  window.clearTimeout(hideTimer)
})
</script>

<template>
  <component :is="layout">
    <RouterView v-slot="{ Component }">
      <PageState :state="viewState" :error-message="apiMessage" @retry="retry">
        <component :is="Component" />
      </PageState>
    </RouterView>
  </component>
  <QuizBridgeDialog />
  <div v-if="bridgeMessage" class="toast" role="status">{{ bridgeMessage }}</div>
</template>
