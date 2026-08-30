<script setup lang="ts">
import CommunityAvatar from '../../components/base/CommunityAvatar.vue'
import type { PublicHomepageModuleDto } from '@ai-learning-hub/contracts'
import { configArray, configText } from '../module-utils'
defineProps<{ module: PublicHomepageModuleDto }>()
</script>
<template>
  <section class="homepage-module student-activity-module">
    <div class="section-heading"><div><span class="eyebrow">{{ configText(module, 'eyebrow', '校园动态') }}</span><h2>{{ configText(module, 'title', module.name) }}</h2><p>{{ configText(module, 'subtitle') }}</p></div></div>
    <div class="student-activity-grid">
      <article v-for="(activity, index) in configArray<{ student: string; action: string; points: number }>(module, 'items')" :key="`${activity.student}-${activity.action}`">
        <CommunityAvatar :name="activity.student" :username="activity.student" /><div><strong>{{ activity.student }}</strong><p>{{ activity.action }}</p><small>{{ index === 0 ? '刚刚' : `${index * 8} 分钟前` }}</small></div><em>+{{ activity.points }} 经验值</em>
      </article>
    </div>
  </section>
</template>
