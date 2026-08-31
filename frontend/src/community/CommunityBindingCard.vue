<script setup lang="ts">
import { computed } from 'vue'
import type { CommunityBindingDto } from '@ai-learning-hub/contracts'
import AppIcon from '../components/base/AppIcon.vue'
import CategoryCover from '../components/base/CategoryCover.vue'
const props = defineProps<{ binding: CommunityBindingDto }>()
defineEmits<{ click: [] }>()
const category = computed(() => props.binding.type === 'lesson' ? 'course' : props.binding.type === 'lab_run' ? 'lab' : props.binding.type)
const icon = computed(() => ({ course: 'book', theme: 'network', lab: 'terminal', resource: 'folder', article: 'sparkles', challenge: 'trophy' })[category.value])
</script>
<template>
  <component :is="binding.route ? 'RouterLink' : 'span'" :to="binding.route || undefined" class="community-binding community-binding-card" :class="[`binding-${category}`, { unavailable: !binding.route }]" @click="$emit('click')">
    <CategoryCover v-if="binding.route" class="binding-art" :title="binding.title" :image="binding.cover" :icon="icon" />
    <span v-else class="binding-icon"><AppIcon :name="icon" :size="23" /></span>
    <div class="binding-copy"><small>{{ category === 'lab' ? '进入同一实训 · 复现学习过程' : '关联学习内容' }}</small><strong>{{ binding.title }}</strong><p v-if="binding.summary">{{ binding.summary }}</p></div>
    <AppIcon v-if="binding.route" class="binding-arrow" name="arrow-up-right" :size="19" />
  </component>
</template>
