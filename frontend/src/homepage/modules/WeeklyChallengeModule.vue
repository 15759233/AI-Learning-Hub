<script setup lang="ts">
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import CategoryCover from '../../components/base/CategoryCover.vue'
import { configText, itemNumber, itemCover } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section v-if="module.items[0]" class="homepage-module challenge-card weekly-challenge-module">
    <div><span class="eyebrow">{{ configText(module, 'eyebrow', '能力验证') }}</span><h2>{{ configText(module, 'title', module.items[0].title) }}</h2><p>{{ module.items[0].summary }}</p><div class="challenge-metrics"><span><strong>{{ itemNumber(module.items[0], 'questions') }}</strong>题目数量</span><span><strong>{{ itemNumber(module.items[0], 'durationMinutes') }}</strong>预计分钟</span><span><strong>{{ itemNumber(module.items[0], 'rewardPoints') }}</strong>积分奖励</span><span><strong>{{ itemNumber(module.items[0], 'participants').toLocaleString() }}</strong>参与人数</span></div><RouterLink class="button primary" to="/assessments">开始挑战</RouterLink></div>
    <CategoryCover :title="module.items[0].title" :media="itemCover(module.items[0])" />
  </section>
</template>
