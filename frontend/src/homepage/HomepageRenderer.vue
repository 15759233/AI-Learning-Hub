<script setup lang="ts">
import type { PublicHomepageDto } from '@ai-learning-hub/contracts'
import { homepageRegistry } from './registry'

defineProps<{ homepage: PublicHomepageDto }>()
</script>

<template>
  <component
    :is="homepageRegistry[module.moduleKey]"
    v-for="module in homepage.modules"
    :key="module.id"
    :module="module"
  />
</template>
