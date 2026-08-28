<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description: string
  image?: string
  dark?: boolean
}>()
</script>

<template>
  <section class="page-hero" :class="{ dark }">
    <div class="hero-copy">
      <span v-if="eyebrow" class="eyebrow">{{ eyebrow }}</span>
      <h1>{{ title }}</h1>
      <p>{{ description }}</p>
      <slot />
    </div>
    <img v-if="image" :src="image" alt="" />
    <slot name="visual" />
  </section>
</template>
