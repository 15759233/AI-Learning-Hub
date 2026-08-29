<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import PageState from './components/PageState.vue'
import QuizBridgeDialog from './components/QuizBridgeDialog.vue'
import { dataMode } from './services/api/client'
import { hydratePublicContent } from './services/api/content'
import { useAuthStore } from './stores/auth'
import { useLearningStore } from './stores/learning'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const learning = useLearningStore()
const bridgeMessage = ref('')
const apiState = ref<'loading' | 'success' | 'error'>(dataMode === 'api' ? 'loading' : 'success')
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
  apiState.value = 'loading'
  apiMessage.value = ''
  try {
    await hydratePublicContent()
    await auth.restore()
    if (auth.user) await learning.syncFromApi()
    apiState.value = 'success'
  } catch (error) {
    apiMessage.value = error instanceof Error ? error.message : '真实 API 加载失败'
    apiState.value = 'error'
  }
}

const showApiError = (event: Event) => {
  bridgeMessage.value = (event as CustomEvent<{ message: string }>).detail.message
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { bridgeMessage.value = '' }, 4600)
}

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
  void loadApi()
})
onBeforeUnmount(() => {
  window.removeEventListener('quiz-bridge', showBridgeNotice)
  window.removeEventListener('api-error', showApiError)
  window.clearTimeout(hideTimer)
})
</script>

<template>
  <AppHeader />
  <main id="main-content" :class="{ 'dark-page': route.meta.dark }">
    <RouterView v-slot="{ Component }">
      <PageState :state="viewState" :error-message="apiMessage" @retry="retry">
        <component :is="Component" />
      </PageState>
    </RouterView>
  </main>
  <AppFooter v-if="!route.meta.dark" />
  <QuizBridgeDialog />
  <div v-if="bridgeMessage" class="toast" role="status">{{ bridgeMessage }}</div>
</template>
