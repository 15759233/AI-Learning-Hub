<script setup lang="ts">
import { computed } from 'vue'
import { useLearningStore } from '../stores/learning'
import { assets } from '../data/mock'
import ProgressBar from './ProgressBar.vue'
import type { Course } from '../types'

const props = withDefaults(defineProps<{ course: Course; compact?: boolean }>(), { compact: false })
const store = useLearningStore()
const favorite = computed(() => store.favorites.includes(props.course.id))
</script>

<template>
  <article class="content-card course-card" :class="{ compact }">
    <RouterLink :to="`/courses/${course.id}`" class="card-cover">
      <img :src="assets.learningCover" :alt="`${course.title}课程封面`" loading="lazy" />
      <span class="tag purple">{{ course.category }}</span>
    </RouterLink>
    <div class="card-body">
      <div class="meta"><span>{{ course.level }}</span><span>{{ course.hours }} 小时</span><span>{{ (course.learners / 1000).toFixed(1) }}k 人</span></div>
      <RouterLink :to="`/courses/${course.id}`"><h3>{{ course.title }}</h3></RouterLink>
      <p>{{ course.description }}</p>
      <ProgressBar v-if="course.progress !== undefined" :value="course.progress" label="学习进度" />
      <div class="card-actions">
        <RouterLink class="button primary ghost-primary" :to="`/courses/${course.id}`">{{ course.progress ? '继续学习' : '开始学习' }}</RouterLink>
        <button class="icon-button" type="button" :aria-label="favorite ? `取消收藏${course.title}` : `收藏${course.title}`" @click="store.toggleFavorite(course.id)">{{ favorite ? '★' : '☆' }}</button>
      </div>
    </div>
  </article>
</template>
