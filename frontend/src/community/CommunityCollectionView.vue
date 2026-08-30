<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CommunitySkeleton from './CommunitySkeleton.vue'
import type { CommunityAuthorDto, CommunityPostDetailDto, CommunityProfileDto, CommunityTopicDto } from '@ai-learning-hub/contracts'
import { useAuthStore } from '../stores/auth'
import { useCommunityStore } from '../stores/community'
import { useLearningStore } from '../stores/learning'
import { communityApi } from '../services/api/community'
import { resetCommunityMock } from '../services/api/community.mock'
import CommunityPostCard from './CommunityPostCard.vue'
import { badgeLabels } from './labels'
const route = useRoute(), auth = useAuthStore(), store = useCommunityStore(), learning = useLearningStore()
const posts = ref<CommunityPostDetailDto[]>([]), profile = ref<CommunityProfileDto | null>(null), topic = ref<CommunityTopicDto | null>(null), error = ref(''), tab = ref('posts'), loading = ref(false), settingsOpen = ref(false)
const following = ref<CommunityAuthorDto[]>([]), username = ref(''), router = useRouter()
const changeUsername = async () => { try { auth.user = await communityApi.username(username.value); await router.replace(`/community/user/${auth.user.username}`) } catch (cause) { error.value = cause instanceof Error ? cause.message : '用户名修改失败' } }
let loadEpoch = 0
const view = computed(() => String(route.meta.communityView || 'search'))
const title = computed(() => view.value === 'bookmarks' ? '收藏与笔记' : view.value === 'topic' ? `# ${topic.value?.name || '学习话题'}` : view.value === 'user' ? profile.value?.displayName || '社区主页' : `搜索：${String(route.query.q || '')}`)
const load = async () => {
  const epoch = ++loadEpoch, accountEpoch = store.epoch
  const current = () => epoch === loadEpoch && accountEpoch === store.epoch
  const requestedView = view.value, requestedTab = tab.value, username = String(route.params.username), slug = String(route.params.slug)
  const query = new URLSearchParams({ keyword: String(route.query.q || ''), ...(route.query.bindingId ? { bindingId: String(route.query.bindingId) } : {}) }).toString()
  posts.value = []; profile.value = null; topic.value = null; following.value = []; settingsOpen.value = false
  loading.value = true; error.value = ''
  try {
    if (requestedView === 'user') {
      const nextProfile = await communityApi.profile(username)
      if (!current()) return
      const [nextPosts, nextFollowing] = await Promise.all([communityApi.list(requestedTab === 'answers' ? 'answers' : 'user', nextProfile.id), requestedTab === 'following' ? communityApi.following(nextProfile.id) : Promise.resolve([])])
      if (!current()) return
      profile.value = nextProfile; posts.value = nextPosts; following.value = nextFollowing
      settingsOpen.value = route.query.settings === '1' && nextProfile.id === auth.user?.id
    } else if (requestedView === 'topic') {
      const [nextTopics, nextPosts] = await Promise.all([communityApi.topics(), communityApi.list('topic', slug)])
      if (!current()) return
      topic.value = nextTopics.find((item) => item.slug === slug) || null; posts.value = nextPosts
    } else {
      const nextPosts = await communityApi.list(requestedView === 'bookmarks' ? 'bookmarks' : 'posts', '', query)
      if (!current()) return
      posts.value = nextPosts
    }
    if (requestedView === 'user' && profile.value) void communityApi.signals({ eventType: 'community_profile_visit', targetType: 'user', targetId: profile.value.id }).catch(() => undefined)
    if (requestedView === 'topic' && topic.value) void communityApi.signals({ eventType: 'community_topic_visit', targetType: 'topic', targetId: topic.value.id }).catch(() => undefined)
  } catch (cause) { if (current()) error.value = cause instanceof Error ? cause.message : '内容读取失败' } finally { if (current()) loading.value = false }
}
const follow = async () => {
  const target = view.value === 'topic' ? topic.value : view.value === 'user' ? profile.value : null, epoch = loadEpoch
  if (!target) return
  try { await store.follow(target.id, view.value === 'topic', !target.following, target) } catch (cause) { if (epoch === loadEpoch) error.value = cause instanceof Error ? cause.message : '关注失败' }
}
const saveProfile = async () => { if (!profile.value || view.value !== 'user') return; const epoch = loadEpoch; try { await communityApi.updateProfile({ bio: profile.value.bio, headline: profile.value.headline, expertiseTopics: profile.value.expertiseTopics, allowAchievementDrafts: profile.value.allowAchievementDrafts }); if (epoch === loadEpoch) { settingsOpen.value = false; await load() } } catch (cause) { if (epoch === loadEpoch) error.value = cause instanceof Error ? cause.message : '保存失败' } }
const resetDemo = async () => { resetCommunityMock(); store.clear(); await load(); await store.loadContext() }
watch([() => route.path, () => route.query.tab], ([, value]) => { const allowed = view.value === 'user' ? ['posts', 'answers', 'topics', 'following'] : view.value === 'bookmarks' ? ['posts', 'notes', 'learning'] : ['posts']; tab.value = allowed.includes(String(value)) ? String(value) : 'posts' }, { immediate: true })
watch([() => route.fullPath, tab], load, { immediate: true })
onBeforeUnmount(() => { loadEpoch++ })
</script>
<template><section><header class="community-page-heading"><div><RouterLink to="/community">← 社区发现</RouterLink><h1>{{ title }}</h1><p v-if="topic">{{ topic.description }}</p><p v-if="profile">{{ profile.headline || '在学习与实践中，一起向前。' }}</p></div><button v-if="topic || (profile && profile.id !== auth.user?.id)" class="button primary small" :disabled="store.operations[`follow:${topic ? 'topic' : 'user'}:${topic?.id || profile?.id}`]" @click="follow">{{ (topic?.following || profile?.following) ? '已关注' : '关注' }}</button></header>
  <section v-if="profile" class="community-profile-summary"><span class="avatar large">{{ profile.displayName[0] }}</span><div><strong>{{ badgeLabels[profile.verifiedType] }}</strong><p>{{ profile.bio || '还没有填写个人介绍。' }}</p><small>{{ profile.school }} · {{ profile.major }}</small><div class="community-profile-stats"><span>{{ profile.postCount }} 动态</span><span>{{ profile.followerCount }} 关注者</span><span>{{ profile.followingCount }} 关注</span></div></div><template v-if="profile.id === auth.user?.id"><RouterLink class="button secondary small" to="/community/drafts">草稿箱</RouterLink><button class="button secondary small" @click="settingsOpen = !settingsOpen">个人设置</button></template></section>
  <form v-if="settingsOpen && profile" class="dialog-form community-profile-form" @submit.prevent="saveProfile"><label>一句话介绍<input v-model="profile.headline" maxlength="120" /></label><label>个人简介<textarea v-model="profile.bio" maxlength="500" rows="3" /></label><label class="community-checkbox"><input v-model="profile.allowAchievementDrafts" type="checkbox" />允许生成学习成就草稿（不会自动发布）</label><button class="button primary">保存设置</button></form>
  <form v-if="settingsOpen && profile?.id === auth.user?.id" class="dialog-form community-profile-form" @submit.prevent="changeUsername"><label>公开用户名（只能修改一次）<input v-model="username" required pattern="[a-z][a-z0-9_]{3,29}" placeholder="4–30位小写字母、数字、下划线" /></label><button class="button secondary">修改用户名</button><RouterLink to="/community/drafts">打开草稿箱</RouterLink></form>
  <p v-if="auth.dataMode === 'mock' && profile?.id === auth.user?.id" class="community-notice">当前为显式演示数据。<button class="text-link" type="button" @click="resetDemo">重置本次社区演示</button></p>
  <div v-if="view === 'user'" class="community-feed-tabs"><button :aria-selected="tab === 'posts'" @click="tab = 'posts'">{{ profile?.id === auth.user?.id ? '我的动态与草稿' : '学习动态' }}</button><button :aria-selected="tab === 'answers'" @click="tab = 'answers'">参与回答</button><button :aria-selected="tab === 'topics'" @click="tab = 'topics'">关注的话题</button><button :aria-selected="tab === 'following'" @click="tab = 'following'">关注的人</button></div><div v-if="view === 'bookmarks'" class="community-feed-tabs"><button :aria-selected="tab === 'posts'" @click="tab = 'posts'">社区收藏</button><button :aria-selected="tab === 'notes'" @click="tab = 'notes'">私人笔记</button><button :aria-selected="tab === 'learning'" @click="tab = 'learning'">学习收藏</button></div>
  <p v-if="error" class="community-error" role="alert">{{ error }} <button @click="load">重试</button></p><CommunitySkeleton v-if="loading" />
  <div v-else-if="tab === 'following'" class="community-collection"><RouterLink v-for="person in following" :key="person.id" class="community-binding" :to="`/community/user/${person.username}`">{{ person.displayName }} · {{ badgeLabels[person.verifiedType] }}</RouterLink><p v-if="!following.length">还没有关注其他学习者。<RouterLink to="/community">发现学习伙伴</RouterLink></p></div>
  <div v-else-if="tab === 'topics'" class="community-collection"><RouterLink v-for="item in profile?.topics" :key="item.id" class="community-binding" :to="`/community/topic/${item.slug}`"># {{ item.name }} · {{ item.postCount }} 条讨论</RouterLink><p v-if="!profile?.topics.length">还没有关注学习话题。<RouterLink to="/community">发现学习话题</RouterLink></p></div>
  <div v-else-if="view === 'bookmarks' && tab === 'notes'" class="community-collection"><article v-for="(note, key) in learning.notes" :key="key" class="community-note"><h2>{{ String(key).split(':')[0] }}</h2><p>{{ note }}</p><button class="button secondary small" @click="store.openComposer({ type: 'note', contentBlocks: [{ type: 'paragraph', text: note }], bindings: [{ type: 'course', id: String(key).split(':')[0] }] })">主动发布为学习笔记</button></article><p v-if="!Object.keys(learning.notes).length">你还没有私人课程笔记。笔记不会自动公开。</p></div>
  <div v-else-if="view === 'bookmarks' && tab === 'learning'" class="community-collection"><RouterLink v-for="favorite in learning.favorites" :key="`${favorite.type}:${favorite.id}`" class="community-binding" :to="favorite.type === 'course' ? `/courses/${favorite.id}` : favorite.type === 'lab' ? `/labs/${favorite.id}` : favorite.type === 'resource' ? `/resources?resource=${favorite.id}` : `/frontier?article=${favorite.id}`">{{ favorite.id }} ↗</RouterLink><p v-if="!learning.favorites.length">还没有收藏学习内容。</p></div>
  <template v-else><CommunityPostCard v-for="post in posts" :key="post.id" :post="post" @changed="load" @hidden="load" /><div v-if="!posts.length && !error" class="community-empty"><h2>这里还没有内容</h2><p>分享一个发现，或从社区首页开始探索。</p><RouterLink class="button secondary" to="/community">探索社区</RouterLink></div></template>
</section></template>
