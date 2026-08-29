<script setup lang="ts">
import { onMounted } from 'vue'
import PageState from '../components/PageState.vue'
import HomepageRenderer from '../homepage/HomepageRenderer.vue'
import HomepageSkeleton from '../homepage/HomepageSkeleton.vue'
import { useHomepageStore } from '../stores/content/homepage'

const homepage = useHomepageStore()
onMounted(() => { void homepage.load() })
</script>

<template>
  <div v-if="homepage.loading" class="page-container home-page"><HomepageSkeleton /><span class="sr-only">正在加载首页</span></div>
  <PageState v-else :state="homepage.error ? 'error' : homepage.value ? 'ready' : 'empty'" :error-message="homepage.error" @retry="homepage.load">
    <div v-if="homepage.value" class="page-container home-page">
      <HomepageRenderer :homepage="homepage.value" />
    </div>
  </PageState>
</template>
