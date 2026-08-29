<script setup lang="ts">
import BaseContentCard from '../base/BaseContentCard.vue'
import AppIcon from '../base/AppIcon.vue'

defineProps<{
  project: {
    id: string
    title: string
    description: string
    skills: string
    steps: number
    duration: string
    coverVariant: string
    icon: string
  }
}>()
</script>

<template>
  <BaseContentCard :title="project.title" :to="`/labs/${project.id}`" :cover-variant="project.coverVariant" :icon="project.icon" tag="综合项目">
    <h3>{{ project.title }}</h3>
    <p>{{ project.description }}</p>
    <small>{{ project.skills }} · {{ project.steps }} 步 · {{ project.duration }}</small>
    <div class="card-actions"><RouterLink class="text-link" :to="`/labs/${project.id}`">查看项目 <AppIcon name="arrow-right" :size="15" /></RouterLink></div>
  </BaseContentCard>
</template>
