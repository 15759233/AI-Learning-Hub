<script setup lang="ts">import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'; import Grid from './HomepageItemGrid.vue'; defineProps<{ module: PublicHomepageModuleDto }>()</script>
<template><Grid :module="module" eyebrow="挑战测评" /></template>
