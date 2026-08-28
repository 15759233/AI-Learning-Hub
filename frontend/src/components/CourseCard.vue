<script setup lang="ts">
import { computed } from 'vue'
import { useLearningStore } from '../stores/learning'
import ProgressBar from './ProgressBar.vue'
import BaseContentCard from './base/BaseContentCard.vue'
import type { Course } from '../types'

const props = withDefaults(defineProps<{ course: Course; compact?: boolean }>(), { compact: false })
const store = useLearningStore()
const favorite = computed(() => store.isFavorite('course', props.course.id))
</script>

<template>
  <BaseContentCard class="course-card" :compact="compact" :title="course.title" :to="`/courses/${course.id}`" :image="course.cover" :cover-variant="course.coverVariant" :icon="course.icon" :tag="course.category">
      <div class="meta"><span>{{ course.level }}</span><span>{{ course.hours }} 小时</span><span>{{ (course.learners / 1000).toFixed(1) }}k 人</span></div>
      <RouterLink :to="`/courses/${course.id}`"><h3>{{ course.title }}</h3></RouterLink>
      <p>{{ course.description }}</p>
      <ProgressBar :value="store.courseProgress[course.id] ?? course.progress ?? 0" label="学习进度" />
      <div class="card-actions">
        <RouterLink class="button primary ghost-primary" :to="`/courses/${course.id}`">{{ store.courseProgress[course.id] || course.progress ? '继续学习' : '开始学习' }}</RouterLink>
        <button class="icon-button" type="button" :aria-label="favorite ? `取消收藏${course.title}` : `收藏${course.title}`" @click="store.toggleFavorite('course', course.id)">{{ favorite ? '★' : '☆' }}</button>
      </div>
  </BaseContentCard>
</template>
