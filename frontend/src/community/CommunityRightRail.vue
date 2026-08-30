<script setup lang="ts">
import { computed } from 'vue'
import { useCommunityStore } from '../stores/community'
import { badgeLabels } from './labels'
const store = useCommunityStore()
const tasks = computed(() => [
  { label: '今日学习任务', item: store.context?.todayPlan, route: '/profile', guide: '制定今天的小目标' },
  { label: '继续学习', item: store.context?.continueCourse, route: '/topics', guide: '选择一门感兴趣的课程' },
  { label: '继续实训', item: store.context?.continueLab, route: '/labs', guide: '开始一次受控实训' },
  { label: '本周挑战', item: store.context?.currentChallenge, route: '/assessments', guide: '查看挑战与测评' },
])
</script>
<template><aside class="community-right-rail" aria-label="学习辅助">
  <section class="community-rail-card learning-compass"><span class="eyebrow">LEARN · BUILD · SHARE</span><h2>把想法，变成能力。</h2><p>今天的一次提问，也可以是下一次突破的起点。</p></section>
  <section class="community-rail-card"><h2>我的学习节奏</h2><article v-for="task in tasks" :key="task.label" class="rail-task"><span>{{ task.label }}</span><RouterLink :to="task.item?.route || task.route">{{ task.item?.title || task.guide }} <b>↗</b></RouterLink><progress v-if="task.item?.progress !== undefined" :value="task.item.progress" max="100" :aria-label="task.label" /></article></section>
  <section class="community-rail-card"><h2>正在讨论的话题</h2><RouterLink v-for="topic in store.context?.trendingTopics || []" :key="topic.id" class="rail-topic" :to="`/community/topic/${topic.slug}`"><strong># {{ topic.name }}</strong><small>{{ topic.postCount }} 条学习交流</small></RouterLink><p v-if="!store.context?.trendingTopics.length">暂无话题，先分享一个学习问题。</p></section>
  <section class="community-rail-card"><h2>一起向前的伙伴</h2><RouterLink v-for="user in store.context?.suggestedUsers || []" :key="user.id" class="rail-person" :to="`/community/user/${user.username}`"><span class="avatar">{{ user.displayName[0] }}</span><span><strong>{{ user.displayName }}</strong><small>{{ badgeLabels[user.verifiedType] || '学习创作者' }}</small></span></RouterLink></section>
  <small class="community-rail-footer">AI MAKER CAMPUS · 让学习留下作品</small>
</aside></template>
