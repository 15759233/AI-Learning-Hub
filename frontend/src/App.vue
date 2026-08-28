<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import AppHeader from './components/AppHeader.vue'
import AppFooter from './components/AppFooter.vue'
import PageState from './components/PageState.vue'

const route = useRoute()
const router = useRouter()
const bridgeMessage = ref('')
let hideTimer: number | undefined

const viewState = computed(() => {
  const value = String(route.query.state || 'success')
  return ['loading', 'empty', 'error'].includes(value) ? value : 'success'
})

const showBridgeNotice = (event: Event) => {
  bridgeMessage.value = (event as CustomEvent<{ message: string }>).detail.message
  window.clearTimeout(hideTimer)
  hideTimer = window.setTimeout(() => { bridgeMessage.value = '' }, 4600)
}

const retry = () => {
  const query = { ...route.query }
  delete query.state
  router.replace({ query })
}

onMounted(() => window.addEventListener('quiz-bridge', showBridgeNotice))
onBeforeUnmount(() => {
  window.removeEventListener('quiz-bridge', showBridgeNotice)
  window.clearTimeout(hideTimer)
})
</script>

<template>
  <AppHeader />
  <main id="main-content" :class="{ 'dark-page': route.meta.dark }">
    <RouterView v-slot="{ Component }">
      <PageState :state="viewState" @retry="retry">
        <component :is="Component" />
      </PageState>
    </RouterView>
  </main>
  <AppFooter v-if="!route.meta.dark" />
  <div v-if="bridgeMessage" class="toast" role="status">{{ bridgeMessage }}</div>
</template>
