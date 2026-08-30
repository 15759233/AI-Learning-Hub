<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { CommunityFeedMode, CommunityPostType } from '@ai-learning-hub/contracts'
import { useThemesStore } from '../stores/content/themes'
import { useCommunityStore } from '../stores/community'
import { communityApi } from '../services/api/community'
import CommunityPostCard from './CommunityPostCard.vue'
import CommunityQuickComposer from './CommunityQuickComposer.vue'
import CommunitySkeleton from './CommunitySkeleton.vue'
import AppDialog from '../components/base/AppDialog.vue'
import AppIcon from '../components/base/AppIcon.vue'
import { postLabels } from './labels'
const store = useCommunityStore(), route = useRoute(), router = useRouter()
const themes = useThemesStore(), demoThemes = computed(() => themes.items)
const mode = computed<CommunityFeedMode>(() => ['for_you', 'following', 'latest'].includes(String(route.query.mode)) ? route.query.mode as CommunityFeedMode : 'for_you')
const type = computed<CommunityPostType | 'all'>(() => Object.keys(postLabels).includes(String(route.query.type)) ? route.query.type as CommunityPostType : 'all')
const key = computed(() => `${mode.value}:${type.value}`), feed = computed(() => store.feeds[key.value])
const loading = ref(false), error = ref(''), newCount = ref(0), since = ref(new Date().toISOString()), search = ref('')
const interestsOpen = ref(false), interests = ref<string[]>([]), sentinel = ref<HTMLElement | null>(null)
let observer: IntersectionObserver | undefined, impressionObserver: IntersectionObserver | undefined, polling: number | undefined
const visibleAt = new Map<string, { at: number; requestId: string }>(), impressed = new Set<string>()
const flushDwell = () => { const items = [...visibleAt].map(([postId, value]) => ({ postId, requestId: value.requestId, dwellMs: Math.min(120000, Date.now() - value.at) })); visibleAt.clear(); if (items.length) void communityApi.impressions(items.slice(0, 30), true).catch(() => undefined) }
const reportVisible = () => {
  flushDwell()
  impressionObserver?.disconnect()
  document.querySelectorAll<HTMLElement>('.community-post[data-post-id]').forEach((element) => impressionObserver?.observe(element))
}
const pending = new Set<string>()
const load = async (reset = false) => { const requestKey = key.value; if (pending.has(requestKey)) return; pending.add(requestKey); loading.value = true; error.value = ''; try { await store.loadFeed(mode.value, type.value, reset); if (key.value !== requestKey) return; if (reset) { newCount.value = 0; since.value = new Date().toISOString() } await nextTick(); reportVisible() } catch (cause) { if (key.value === requestKey) error.value = cause instanceof Error ? cause.message : '信息流加载失败' } finally { pending.delete(requestKey); loading.value = pending.has(key.value) } }
const change = async (nextMode: CommunityFeedMode, nextType: CommunityPostType | 'all') => {
  if (feed.value) feed.value.scroll = window.scrollY
  store.lastFeedLocation = `/community?${new URLSearchParams({ mode: nextMode, type: nextType })}`
  await router.replace({ query: { mode: nextMode, type: nextType } })
}
watch(key, async () => { if (!feed.value?.loaded) await load(true); await nextTick(); window.scrollTo({ top: feed.value?.scroll || 0 }); reportVisible() })
watch(() => store.publishNotice?.id, async (id) => { if (id) { await nextTick(); reportVisible() } })
watch(() => store.context?.needsInterests, async (needs) => { if (needs) { try { await themes.load(); interestsOpen.value = true } catch (cause) { error.value = cause instanceof Error ? cause.message : '学习方向读取失败' } } }, { immediate: true })
const saveInterests = async () => { const epoch = store.epoch; try { const context = await communityApi.interests(interests.value); if (epoch !== store.epoch) return; store.context = context; store.invalidateFollowing(); interestsOpen.value = false; await load(true) } catch (cause) { error.value = cause instanceof Error ? cause.message : '兴趣保存失败' } }
const hidden = async () => { await load(true) }
onMounted(async () => {
  impressionObserver = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      const postId = (entry.target as HTMLElement).dataset.postId!
      if (entry.isIntersecting) {
        const requestId = feed.value?.requestId || '', key = `${requestId}:${postId}`
        visibleAt.set(postId, { at: Date.now(), requestId })
        if (!impressed.has(key)) { impressed.add(key); void communityApi.impressions([{ requestId, postId }]).catch(() => undefined) }
      } else if (visibleAt.has(postId)) {
        const value = visibleAt.get(postId)!, dwellMs = Math.min(120000, Date.now() - value.at)
        visibleAt.delete(postId); void communityApi.impressions([{ requestId: value.requestId, postId, dwellMs }], true).catch(() => undefined)
      }
    }
  }, { threshold: 0.5 })
  if (!feed.value?.loaded) await load(true); else reportVisible()
  observer = new IntersectionObserver((entries) => { if (entries[0]?.isIntersecting && feed.value?.cursor && !loading.value && !error.value) void load() }, { rootMargin: '250px' })
  if (sentinel.value) observer.observe(sentinel.value)
  polling = window.setInterval(async () => { if (document.visibilityState === 'visible') { try { newCount.value = (await communityApi.updates(since.value, mode.value, type.value)).count } catch { /* 手动刷新仍可重试。 */ } } }, 60000)
})
onBeforeUnmount(() => { flushDwell(); if (feed.value) feed.value.scroll = window.scrollY; observer?.disconnect(); impressionObserver?.disconnect(); window.clearInterval(polling) })
</script>
<template><section class="community-feed">
  <CommunityQuickComposer />
  <CommunitySkeleton v-if="loading && !feed?.items.length" />
  <header class="community-page-heading"><div><span class="eyebrow">学习，让想法发生</span><h1>社区发现</h1><p>遇见一个好问题，开启一次新实践。</p></div><button class="icon-button" aria-label="刷新信息流" @click="load(true)"><AppIcon name="refresh" :size="19" /></button></header>
  <div class="community-feed-tabs" role="tablist" aria-label="信息流模式"><button v-for="[value, label] in [['for_you', '推荐'], ['following', '关注'], ['latest', '最新']]" :key="value" role="tab" :aria-selected="mode === value" @click="change(value as CommunityFeedMode, type)">{{ label }}</button></div>
  <div class="community-filters"><button v-for="[value, label] in [['all', '全部'], ['question', '学习问答'], ['note', '学习笔记'], ['lab_result', '实训成果'], ['project', '创客项目'], ['frontier_discussion', '前沿讨论']]" :key="value" :class="{ active: type === value }" @click="change(mode, value as CommunityPostType | 'all')">{{ label }}</button></div>
  <form class="community-search" @submit.prevent="router.push({ path: '/community/search', query: { q: search } })"><AppIcon name="search" :size="17" /><input v-model="search" aria-label="搜索社区学习内容" placeholder="搜索学习问题、笔记与项目" maxlength="120" /><button class="text-link">搜索</button></form>
  <button v-if="newCount" class="community-new-content" @click="load(true)">有 {{ newCount }} 条新内容，点击加载</button>
  <p v-if="store.error" class="community-notice">{{ store.error }}</p>
  <p v-if="error" class="community-error" role="alert">{{ error }} <button class="text-link" @click="load(true)">重试</button></p>
  <template v-for="item in feed?.items || []" :key="item.id"><CommunityPostCard v-if="item.type === 'post'" :post="item.post" :request-id="feed?.requestId" @changed="store.refreshPost(item.id)" @hidden="hidden" /><section v-else-if="item.type === 'topic_suggestion'" class="community-learning-unit"><span class="eyebrow">发现新方向</span><h2>让兴趣多走一步</h2><div class="community-topic-list"><RouterLink v-for="topic in item.topics" :key="topic.id" :to="`/community/topic/${topic.slug}`"># {{ topic.name }}</RouterLink></div></section><section v-else class="community-learning-unit"><span class="eyebrow">{{ item.type === 'challenge' ? '用实践验证理解' : '回到你的学习节奏' }}</span><h2>{{ item.content.title }}</h2><p>{{ item.content.summary }}</p><RouterLink class="button primary small" :to="item.content.route">{{ item.type === 'challenge' ? '参加挑战' : '继续学习' }} ↗</RouterLink></section></template>
  <div v-if="feed?.loaded && !feed.items.length && !loading" class="community-empty"><AppIcon name="message" :size="34" /><h2>{{ mode === 'following' ? '关注老师、同学或学习话题' : '还没有可见的内容' }}</h2><p>从一个问题开始，把学习过程分享给同伴。</p><button class="button primary" @click="store.openComposer({ type: 'question' })">提出问题</button></div>
  <div ref="sentinel" class="community-load-more"><span v-if="loading" role="status">正在加载学习内容…</span><button v-else-if="feed?.cursor" class="button secondary" @click="load()">加载更多</button><small v-else-if="feed?.items.length">已读完这一组内容，随时手动刷新。</small></div>
  <AppDialog v-model="interestsOpen" title="选择 3 个感兴趣的学习方向"><p>用于关注相关话题；你随时可以调整。</p><div class="community-interest-options"><label v-for="theme in demoThemes" :key="theme.slug"><input v-model="interests" type="checkbox" :value="theme.slug" :disabled="interests.length >= 3 && !interests.includes(theme.slug)" /><strong>{{ theme.title }}</strong></label></div><button class="button primary" :disabled="interests.length !== 3" @click="saveInterests">开始发现学习内容</button></AppDialog>
</section></template>
