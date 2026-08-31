<script setup lang="ts">
import { computed, onMounted } from 'vue'
import type { PublicPageVisualKey } from '@ai-learning-hub/contracts'
import CategoryCover from './base/CategoryCover.vue'
import { pageHeroCover } from '../media/catalog'
import { usePageVisualsStore } from '../stores/content/page-visuals'
const props = defineProps<{ visualKey: PublicPageVisualKey }>()
const visuals = usePageVisualsStore()
const media = computed(() => pageHeroCover(props.visualKey, visuals.value))
onMounted(() => { void visuals.load() })
</script>

<template>
  <CategoryCover class="page-hero-art" title="" :media="media" decorative eager ratio="2 / 1" />
</template>
