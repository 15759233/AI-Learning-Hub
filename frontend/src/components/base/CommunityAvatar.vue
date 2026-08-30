<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { avatarCandidates } from '../../assets/community/manifest'
import AppIcon from './AppIcon.vue'
const props = withDefaults(defineProps<{ src?: string | null; avatarKey?: string; username?: string; name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; verified?: boolean }>(), { size: 'md' })
const candidates = computed(() => avatarCandidates(props.src, props.username, props.avatarKey))
const failed = ref(0)
watch(candidates, () => { failed.value = 0 })
const source = computed(() => candidates.value[failed.value])
const dimension = computed(() => ({ xs: 28, sm: 36, md: 44, lg: 72 })[props.size])
const initials = computed(() => Array.from(props.name.trim())[0]?.toUpperCase() || '学')
</script>
<template>
  <span class="community-avatar" :class="`avatar-${size}`" role="img" :aria-label="`${name || '学习者'}的头像`">
    <img v-if="source" :key="source" :src="source" alt="" :width="dimension" :height="dimension" loading="lazy" decoding="async" @error="failed++" />
    <span v-else aria-hidden="true">{{ initials }}</span>
    <AppIcon v-if="verified" class="avatar-verified" name="check" :size="14" />
  </span>
</template>
