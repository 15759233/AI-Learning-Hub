<script setup lang="ts">
import type { PublicPageVisualKey } from '@ai-learning-hub/contracts'
import PageHeroArt from './PageHeroArt.vue'
defineProps<{
  eyebrow?: string
  title: string
  description: string
  image?: string
  visualKey?: PublicPageVisualKey
  dark?: boolean
}>()
</script>

<template>
  <section class="page-hero" :class="{ dark }">
    <PageHeroArt v-if="visualKey" :visual-key="visualKey" />
    <div class="hero-copy">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <slot />
    </div>
    <img v-if="image && !visualKey" :src="image" alt="" />
    <slot name="visual" />
  </section>
</template>
