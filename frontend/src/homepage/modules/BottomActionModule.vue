<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import { computed } from 'vue'
import { configText } from '../module-utils'
const props = defineProps<{ module: PublicHomepageModuleDto }>()
const primary = computed(() => props.module.config.primaryAction as { label?: string; route?: string } | undefined)
const secondary = computed(() => props.module.config.secondaryAction as { label?: string; route?: string } | undefined)
</script>
<template>
  <section class="bottom-cta">
    <div><span class="eyebrow">{{ configText(module, 'eyebrow', '开始行动') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle', '今天开始，建立属于你的 AI 能力路径。') }}</p></div>
    <div><RouterLink class="button primary" :to="primary?.route || '/topics'">{{ primary?.label || '免费开始学习' }}</RouterLink><RouterLink class="button secondary" :to="secondary?.route || '/labs'">{{ secondary?.label || '浏览实训项目' }}</RouterLink></div>
  </section>
</template>
