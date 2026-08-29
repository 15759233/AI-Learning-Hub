<script setup lang="ts">
import type { Article } from '../types'
import { storeToRefs } from 'pinia'
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArticleDetailPanel from '../components/ArticleDetailPanel.vue'
import CategoryCover from '../components/base/CategoryCover.vue'
import ArticleCard from '../components/cards/ArticleCard.vue'
import ContentPagination from '../components/ContentPagination.vue'
import { behaviorApi } from '../services/api/behavior'
import { dataMode } from '../services/api/client'
import { useAuthStore } from '../stores/auth'
import { mapSelectedArticle, useArticlesStore } from '../stores/content/articles'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const articlesStore = useArticlesStore()
const { items: articles } = storeToRefs(articlesStore)
const category = ref('全部')
const visible = ref(5)
const email = ref('')
const subscribed = ref(false)
const selectedTech = ref('')
const categories = ['全部', '大模型', 'Agent', '多模态', '机器人', 'AI 安全']
const technologies: Record<string, string[]> = {
  全部: ['MoE', 'RAG', 'Function Calling', '多模态对齐'],
  大模型: ['MoE', 'RAG', '高效推理', '模型微调'],
  Agent: ['Function Calling', '任务规划', '工具白名单', '多智能体协作'],
  多模态: ['跨模态对齐', '视觉编码器', '数据质量', '统一表示'],
  机器人: ['环境感知', '路径规划', '动作控制', '仿真评估'],
  'AI 安全': ['输入校验', '权限边界', '内容安全', '人工确认'],
}
const filtered = computed(() => category.value === '全部' ? articles.value : articles.value.filter((item) => item.category === category.value))
const focusArticle = computed(() => filtered.value[0] || articles.value[0])
const recommendations = computed(() => {
  if (!focusArticle.value) return []
  if (dataMode === 'api') return filtered.value.filter((item) => item.recommendations?.length && item.id !== focusArticle.value.id).slice(0, 3)
  const scoped = filtered.value.filter((item) => item.id !== focusArticle.value.id)
  return (scoped.length >= 3 ? scoped : articles.value.filter((item) => item.id !== focusArticle.value.id)).slice(0, 3)
})
const selectedArticle = computed(() => {
  const summary = articles.value.find((article) => article.id === route.query.article)
    || mapSelectedArticle(articlesStore.selected, route.query.article)
  const detail = articlesStore.selected
  if (dataMode !== 'api' || !summary || detail?.slug !== route.query.article) return summary
  const blocks = Array.isArray(detail.data.blocks)
    ? detail.data.blocks.map((block) => String(block.text || '')).filter(Boolean)
    : []
  return {
    ...summary,
    content: Array.isArray(detail.data.content) ? detail.data.content.map(String) : blocks,
  }
})
const articleOpen = computed({
  get: () => typeof route.query.article === 'string',
  set: (open) => {
    if (open) return
    const query = { ...route.query }
    delete query.article
    router.replace({ query })
  },
})
const openArticle = (article: Article) => router.push({ query: { ...route.query, article: article.id } })
const subscribe = () => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) subscribed.value = true
}
watch(category, () => {
  visible.value = 5
  selectedTech.value = ''
  if (selectedArticle.value && category.value !== '全部' && selectedArticle.value.category !== category.value) articleOpen.value = false
})
onMounted(() => { void articlesStore.load() })
watch(() => route.query.article, async (slug) => {
  if (dataMode !== 'api' || typeof slug !== 'string') return
  await articlesStore.detail(slug)
  if (!auth.user) return
  try {
    await behaviorApi.recordView('article', slug)
  } catch (error) {
    window.dispatchEvent(new CustomEvent('api-error', { detail: { message: error instanceof Error ? error.message : '文章浏览记录写入失败' } }))
  }
}, { immediate: true })
</script>

<template>
  <div class="page-container frontier-page">
    <div class="page-title"><span class="eyebrow">阅读与发现</span><h1>AI 前沿</h1><p>用清晰、可信的技术解读，理解 AI 世界正在发生什么。</p></div>
    <div class="category-tabs compact-tabs"><button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button></div>
    <section v-if="focusArticle" class="focus-layout">
      <article class="focus-article"><div><span class="tag orange">{{ dataMode === 'api' ? '已发布资讯' : '本周重磅 · 演示内容' }}</span><h2>{{ focusArticle.title }}</h2><p>{{ focusArticle.summary }}</p><div class="meta"><span>{{ focusArticle.category }}</span><span>{{ focusArticle.readMinutes === undefined ? '阅读时长 —' : `${focusArticle.readMinutes} 分钟阅读` }}</span><span>{{ focusArticle.publishedAt || '发布时间 —' }}</span></div><button class="text-link" type="button" @click="openArticle(focusArticle)">阅读全文 →</button></div><CategoryCover :title="focusArticle.title" :variant="focusArticle.coverVariant" :icon="focusArticle.icon" :image="focusArticle.cover" /></article>
      <aside class="topic-ranking"><template v-if="dataMode === 'mock'"><h3>热门话题</h3><ol><li v-for="(topic, index) in ['多智能体协作', 'RAG 评估', 'Function Calling', '多模态对齐', '模型安全']" :key="topic"><strong>0{{ index + 1 }}</strong><button type="button" @click="selectedTech = topic">{{ topic }}</button></li></ol><p v-if="selectedTech" class="notice">已选择“{{ selectedTech }}”，当前展示演示专题。</p></template><h3>{{ dataMode === 'api' ? '推荐阅读' : '本周推荐阅读' }}</h3><RouterLink v-for="article in recommendations" :key="article.id" :to="{ path: '/frontier', query: { article: article.id } }">{{ article.title }}</RouterLink><p v-if="!recommendations.length">尚未配置推荐文章。</p></aside>
    </section>
    <div class="editorial-layout">
      <section>
        <div class="section-heading"><div><span class="eyebrow">编辑精选</span><h2>最新资讯</h2></div></div>
        <div class="editorial-list"><RouterLink v-for="article in filtered.slice(0, visible)" :key="article.id" class="editorial-item" :to="{ path: '/frontier', query: { article: article.id } }"><CategoryCover :title="article.title" :variant="article.coverVariant" :icon="article.icon" :image="article.cover" /><div><span class="tag">{{ article.category }}</span><h3>{{ article.title }}</h3><p>{{ article.summary }}</p><small>{{ article.publishedAt || '发布时间 —' }} · {{ article.readMinutes === undefined ? '阅读时长 —' : `${article.readMinutes} 分钟阅读` }}{{ dataMode === 'mock' ? ' · 演示资讯' : '' }}</small></div></RouterLink></div>
        <ContentPagination :page="articlesStore.page" :page-size="articlesStore.pageSize" :total="articlesStore.total" @change="articlesStore.load({ page: $event })" />
      </section>
      <aside class="study-aside"><h3>本周值得了解</h3><div v-if="dataMode === 'mock'" class="tech-list"><button v-for="tech in technologies[category]" :key="tech" type="button" @click="selectedTech = tech">{{ tech }}<span>用 3 分钟了解 →</span></button></div><p v-else>专题技术卡尚未配置。</p><p v-if="dataMode === 'mock' && selectedTech" class="notice">“{{ selectedTech }}”技术卡已选中，完整阅读页不在本轮范围。</p><div v-if="dataMode === 'mock'" class="newsletter"><span class="eyebrow">AI 前沿周报</span><h3>每周一封技术摘要</h3><p>当前只进行前端邮箱校验，不会伪造真实订阅。</p><form @submit.prevent="subscribe"><input v-model="email" required type="email" placeholder="你的邮箱" aria-label="订阅邮箱" /><button class="button primary full-width" type="submit">验证订阅</button></form><p v-if="subscribed" role="status">邮箱格式有效，订阅服务未在演示环境启用。</p></div></aside>
    </div>
    <section><div class="section-heading"><h2>深度洞察</h2></div><div class="four-grid"><ArticleCard v-for="article in articles.slice(0, 4)" :key="article.id" :article="article" @open="openArticle" /></div></section>
  </div>
  <ArticleDetailPanel v-model="articleOpen" :article="selectedArticle" :missing="articleOpen && !selectedArticle" />
</template>
