<script setup lang="ts">import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'; defineProps<{ module: PublicHomepageModuleDto }>()</script>
<template><section class="homepage-module panel"><span class="eyebrow">能力方法</span><h2>{{ module.name }}</h2><p>{{ String(module.config.description || '尚未配置能力方法说明') }}</p></section></template>
