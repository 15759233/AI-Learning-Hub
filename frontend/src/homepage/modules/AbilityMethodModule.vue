<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import { configArray, configText } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module ability-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '学习方法') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2></div><p>{{ configText(module, 'subtitle') }}</p></div>
    <div class="ability-list">
      <article v-for="item in configArray<{ number: string; title: string; description: string; color: string }>(module, 'items')" :key="item.number" :class="`ability-${item.color}`">
        <strong>{{ item.number }}</strong><div><h3>{{ item.title }}</h3><p>{{ item.description }}</p></div>
      </article>
    </div>
  </section>
</template>
