<script setup lang="ts">
import { communityArt } from '../assets/community/manifest'
defineProps<{ title: string; description?: string }>()
</script>
<template><div class="community-empty"><img v-bind="communityArt.empty" alt="" loading="lazy" /><h2>{{ title }}</h2><p v-if="description">{{ description }}</p><slot /></div></template>
