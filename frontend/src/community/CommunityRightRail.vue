<script setup lang="ts">
import { computed, ref } from 'vue'
import { useCommunityStore } from '../stores/community'
import { badgeLabels } from './labels'
import CommunitySkeleton from './CommunitySkeleton.vue'
const store = useCommunityStore()
const error = ref('')
const tasks = computed(() => [
  { label: '今日学习任务', item: store.context?.todayPlan, route: '/profile', guide: '制定今天的小目标' },
  { label: '继续学习', item: store.context?.continueCourse, route: '/topics', guide: '选择一门感兴趣的课程' },
  { label: '继续实训', item: store.context?.continueLab, route: '/labs', guide: '开始一次受控实训' },
  { label: '本周挑战', item: store.context?.currentChallenge, route: '/assessments', guide: '查看挑战与测评' },
])
const hasLearning = computed(() => tasks.value.some((task) => task.item))
const follow = async (id: string, topic: boolean, active: boolean) => { error.value = ''; try { await store.follow(id, topic, active) } catch (cause) { error.value = cause instanceof Error ? cause.message : '关注失败，请重试' } }
</script>
<template><aside class="community-right-rail" aria-label="学习辅助">
  <CommunitySkeleton v-if="!store.context && !store.error" :rows="2" />
  <template v-else>
  <section v-if="!hasLearning" class="community-rail-card learning-compass"><span class="eyebrow">LEARN · BUILD · SHARE</span><h2>把想法，变成能力。</h2></section>
  <section class="community-rail-card"><h2>我的学习节奏</h2><article v-for="task in tasks" :key="task.label" class="rail-task"><span>{{ task.label }}</span><RouterLink :to="task.item?.route || task.route">{{ task.item?.title || task.guide }} <b>↗</b></RouterLink><progress v-if="task.item?.progress !== undefined" :value="task.item.progress" max="100" :aria-label="task.label" /></article></section>
  <section class="community-rail-card"><h2>正在讨论的话题</h2><div v-for="topic in (store.context?.trendingTopics || []).slice(0, 5)" :key="topic.id" class="rail-topic"><RouterLink :to="`/community/topic/${topic.slug}`"><strong># {{ topic.name }}</strong><small>{{ topic.postCount }} 条学习交流</small></RouterLink><button class="rail-follow" :aria-label="`${topic.following ? '取消关注' : '关注'}话题 ${topic.name}`" :aria-pressed="topic.following" :disabled="store.operations[`follow:topic:${topic.id}`]" @click="follow(topic.id, true, !topic.following)">{{ topic.following ? '已关注' : '关注' }}</button></div><p v-if="!store.context?.trendingTopics.length">暂无话题，先分享一个学习问题。</p><RouterLink class="text-link rail-more" to="/community/search?type=topics">查看更多话题</RouterLink></section>
  <section class="community-rail-card"><h2>一起向前的伙伴</h2><div v-for="user in (store.context?.suggestedUsers || []).slice(0, 4)" :key="user.id" class="rail-person"><RouterLink :to="`/community/user/${user.username}`"><span class="avatar">{{ user.displayName[0] }}</span><span><strong>{{ user.displayName }}</strong><small>{{ badgeLabels[user.verifiedType] || '学习创作者' }}</small></span></RouterLink><button class="rail-follow" :aria-label="`${store.authorFollowing[user.id] ? '取消关注' : '关注'}用户 ${user.displayName}`" :aria-pressed="!!store.authorFollowing[user.id]" :disabled="store.operations[`follow:user:${user.id}`]" @click="follow(user.id, false, !store.authorFollowing[user.id])">{{ store.authorFollowing[user.id] ? '已关注' : '关注' }}</button></div><RouterLink class="text-link rail-more" to="/community/search?type=users">查看更多：搜索学习者</RouterLink></section>
  <p v-if="error" class="community-error" role="alert">{{ error }}</p>
  <small class="community-rail-footer">AI MAKER CAMPUS · 让学习留下作品</small>
  </template>
</aside></template>
