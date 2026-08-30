<script setup lang="ts">
import { ref } from 'vue'
import type { CommunityPostSummaryDto, CommunityBindingDto, CommunitySignalInput } from '@ai-learning-hub/contracts'
import { useAuthStore } from '../stores/auth'
import { useCommunityStore } from '../stores/community'
import { communityApi } from '../services/api/community'
import AppDialog from '../components/base/AppDialog.vue'
import AppIcon from '../components/base/AppIcon.vue'
import CommunityBlocks from './CommunityBlocks.vue'
import { postLabels, badgeLabels } from './labels'
const props = defineProps<{ post: CommunityPostSummaryDto; detail?: boolean; requestId?: string }>()
const emit = defineEmits<{ changed: []; hidden: [id: string] }>()
const auth = useAuthStore(), store = useCommunityStore()
const pending = ref(false), error = ref(''), reportOpen = ref(false), deleteOpen = ref(false), reason = ref('内容不准确'), description = ref(''), expanded = ref(false)
const act = async (action: () => Promise<unknown>, refresh = true) => { pending.value = true; error.value = ''; try { await action(); if (refresh) emit('changed') } catch (cause) { error.value = cause instanceof Error ? cause.message : '操作失败' } finally { pending.value = false } }
const reaction = (kind: 'like' | 'useful' | 'bookmark') => act(async () => { const active = kind === 'like' ? props.post.viewerState.liked : kind === 'useful' ? props.post.viewerState.markedUseful : props.post.viewerState.bookmarked; await communityApi.reaction(props.post.id, kind, !active); await store.refreshPost(props.post.id) })
const hide = (kind: 'hide' | 'not-interested' | 'mute' | 'block') => act(async () => { await communityApi.feedback(['mute', 'block'].includes(kind) ? props.post.author.id : props.post.id, kind); store.removePost(props.post.id); emit('hidden', props.post.id) }, false)
const remove = () => act(async () => { await communityApi.remove(props.post.id); deleteOpen.value = false; store.removePost(props.post.id); emit('hidden', props.post.id) }, false)
const report = () => act(async () => { await communityApi.report(props.post.id, reason.value, description.value); reportOpen.value = false })
const edit = () => act(async () => { const post = await communityApi.post(props.post.id); store.openComposer({ type: post.type, title: post.title || '', contentBlocks: post.contentBlocks, bindings: post.bindings.filter((b) => b.status !== 'unavailable').map((b) => ({ type: b.type, id: b.id })), topicIds: post.topics.map((t) => t.id), visibility: post.visibility, status: post.status === 'draft' ? 'draft' : 'published' }, post.id) })
const openPost = () => { void communityApi.signals({ eventType: 'community_post_click', targetType: 'post', targetId: props.post.id, requestId: props.requestId }).catch(() => undefined) }
const bindingClick = (binding: CommunityBindingDto) => {
  const target = binding.type === 'lesson' ? 'course' : binding.type === 'lab_run' ? 'lab' : binding.type
  const eventType = ['course', 'lab', 'resource', 'article', 'challenge'].includes(target) ? `community_to_${target}` as CommunitySignalInput['eventType'] : 'community_binding_click'
  void communityApi.signals({ eventType, targetType: 'post', targetId: props.post.id, binding: { type: binding.type, id: binding.id }, requestId: props.requestId }).catch(() => undefined)
}
</script>
<template><article class="community-post" :data-post-id="post.id">
  <header class="community-post-header"><RouterLink class="avatar" :to="`/community/user/${post.author.username}`">{{ post.author.displayName[0] }}</RouterLink><div class="community-author"><RouterLink :to="`/community/user/${post.author.username}`"><strong>{{ post.author.displayName }}</strong><span v-if="post.author.verifiedType !== 'none'" class="community-badge">{{ badgeLabels[post.author.verifiedType] }}</span></RouterLink><small>{{ post.author.school || post.author.major || '学习社区' }} · {{ new Date(post.publishedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' }) }}<span v-if="post.editedAt"> · 已编辑</span></small></div><span class="community-type" :class="post.type">{{ postLabels[post.type] }}</span><details class="community-post-menu"><summary aria-label="更多动态操作">•••</summary><div><button v-if="post.author.id !== auth.user?.id" type="button" @click="act(() => store.follow(post.author.id, false, !post.viewerState.followingAuthor))">{{ post.viewerState.followingAuthor ? '取消关注' : '关注作者' }}</button><template v-if="post.author.id === auth.user?.id"><button type="button" @click="edit">编辑动态</button><button type="button" @click="deleteOpen = true">删除动态</button></template><button type="button" @click="hide('hide')">隐藏此内容</button><button type="button" @click="hide('not-interested')">减少此类内容</button><template v-if="post.author.id !== auth.user?.id"><button type="button" @click="hide('mute')">静音作者</button><button type="button" @click="hide('block')">屏蔽作者</button></template><button type="button" @click="reportOpen = true">举报内容</button></div></details></header>
  <div v-if="post.question" class="question-state"><span :class="{ solved: post.question.status === 'solved' }">{{ post.question.status === 'solved' ? '✓ 已解决' : '等待回答' }}</span><small v-if="post.question.teacherAnswered">认证教师参与回答</small></div>
  <h2 v-if="post.title" class="community-post-title"><RouterLink :to="`/community/post/${post.id}`" @click="openPost">{{ post.title }}</RouterLink></h2>
  <CommunityBlocks :blocks="post.contentBlocks" :compact="!detail && !expanded" />
  <button v-if="!detail && !expanded" class="text-link" type="button" @click="expanded = true; communityApi.signals({ eventType: 'community_post_expand', targetType: 'post', targetId: post.id }).catch(() => undefined)">展开全文</button>
  <div class="community-bindings"><template v-for="binding in post.bindings" :key="`${binding.type}:${binding.id}`"><RouterLink v-if="binding.route" :to="binding.route" class="community-binding" @click="bindingClick(binding)"><span><AppIcon :name="binding.type === 'lab' || binding.type === 'lab_run' ? 'terminal' : 'book'" :size="19" /></span><div><small>{{ binding.type === 'lab' || binding.type === 'lab_run' ? '进入同一实训 · 复现学习过程' : '关联学习内容' }}</small><strong>{{ binding.title }}</strong><p v-if="binding.summary">{{ binding.summary }}</p></div><b>↗</b></RouterLink><span v-else class="community-binding unavailable">{{ binding.title }}</span></template></div>
  <div class="community-topic-list"><RouterLink v-for="topic in post.topics" :key="topic.id" :to="`/community/topic/${topic.slug}`"># {{ topic.name }}</RouterLink><span v-if="post.visibility === 'school'" class="muted">仅同校可见</span><span v-if="post.status === 'draft'" class="muted">私人草稿</span></div>
  <p v-for="label in post.labels" :key="label" class="community-notice">{{ label }}</p><p v-if="post.recommendationReasons.length" class="recommendation-reason">{{ post.recommendationReasons.join(' · ') }}</p>
  <footer class="community-interactions">
    <RouterLink :to="`/community/post/${post.id}`" :aria-label="`评论 ${post.stats.comments}`" @click="openPost"><AppIcon name="message" :size="18" /><span>{{ post.stats.comments || '评论' }}</span></RouterLink>
    <button :class="{ selected: post.viewerState.liked }" :aria-pressed="post.viewerState.liked" :aria-label="`点赞 ${post.stats.likes}`" :disabled="pending" @click="reaction('like')"><AppIcon name="heart" :size="18" /><span>{{ post.stats.likes || '点赞' }}</span></button>
    <button :class="{ selected: post.viewerState.markedUseful }" :aria-pressed="post.viewerState.markedUseful" :aria-label="`有帮助 ${post.stats.useful}`" :disabled="pending" @click="reaction('useful')"><AppIcon name="check" :size="18" /><span>{{ post.stats.useful || '有帮助' }}</span></button>
    <button :class="{ selected: post.viewerState.bookmarked }" :aria-pressed="post.viewerState.bookmarked" :aria-label="`收藏 ${post.stats.bookmarks}`" :disabled="pending" @click="reaction('bookmark')"><AppIcon name="bookmark" :size="18" /><span>{{ post.stats.bookmarks || '收藏' }}</span></button>
  </footer><p v-if="error" class="community-error" role="alert">{{ error }}</p>
  <AppDialog v-model="reportOpen" title="举报内容"><form class="dialog-form" @submit.prevent="report"><label>举报原因<select v-model="reason"><option>内容不准确</option><option>不当内容或骚扰</option><option>泄露个人信息</option><option>垃圾广告</option><option>版权问题</option></select></label><label>补充说明<textarea v-model="description" maxlength="1000" rows="3" /></label><p>举报信息仅供有权限的审核人员处理，不向作者公开。</p><button class="button primary" :disabled="pending">提交举报</button></form></AppDialog>
  <AppDialog v-model="deleteOpen" title="删除自己的动态"><p>动态将不再对社区显示，讨论记录保留用于审计。</p><button class="button primary" :disabled="pending" @click="remove">确认删除</button></AppDialog>
</article></template>
