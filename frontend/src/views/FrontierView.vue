<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import ArticleDetailPanel from '../components/ArticleDetailPanel.vue'
import CategoryCover from '../components/base/CategoryCover.vue'
import ArticleCard from '../components/cards/ArticleCard.vue'
import { articles } from '../data/mock'

const route = useRoute()
const router = useRouter()
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
const filtered = computed(() => category.value === '全部' ? articles : articles.filter((item) => item.category === category.value))
const focusArticle = computed(() => filtered.value[0] || articles[0])
const recommendations = computed(() => {
  const scoped = filtered.value.filter((item) => item.id !== focusArticle.value.id)
  return (scoped.length >= 3 ? scoped : articles.filter((item) => item.id !== focusArticle.value.id)).slice(0, 3)
})
const selectedArticle = computed(() => articles.find((article) => article.id === route.query.article))
const articleOpen = computed({
  get: () => typeof route.query.article === 'string',
  set: (open) => {
    if (open) return
    const query = { ...route.query }
    delete query.article
    router.replace({ query })
  },
})
const openArticle = (article: (typeof articles)[number]) => router.push({ query: { ...route.query, article: article.id } })
const subscribe = () => {
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)) subscribed.value = true
}
watch(category, () => {
  visible.value = 5
  selectedTech.value = ''
  if (selectedArticle.value && category.value !== '全部' && selectedArticle.value.category !== category.value) articleOpen.value = false
})
</script>

<template>
  <div class="page-container frontier-page">
    <div class="page-title"><span class="eyebrow">阅读与发现</span><h1>AI 前沿</h1><p>用清晰、可信的技术解读，理解 AI 世界正在发生什么。</p></div>
    <div class="category-tabs compact-tabs"><button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button></div>
    <section class="focus-layout">
      <article class="focus-article"><div><span class="tag orange">本周重磅 · 演示内容</span><h2>{{ focusArticle.title }}</h2><p>{{ focusArticle.summary }}</p><div class="meta"><span>{{ focusArticle.category }}</span><span>{{ focusArticle.readMinutes }} 分钟阅读</span><span>{{ focusArticle.publishedAt }}</span></div><button class="text-link" type="button" @click="openArticle(focusArticle)">阅读全文 →</button></div><CategoryCover :title="focusArticle.title" :variant="focusArticle.coverVariant" :icon="focusArticle.icon" /></article>
      <aside class="topic-ranking"><h3>热门话题</h3><ol><li v-for="(topic, index) in ['多智能体协作', 'RAG 评估', 'Function Calling', '多模态对齐', '模型安全']" :key="topic"><strong>0{{ index + 1 }}</strong><button type="button" @click="selectedTech = topic">{{ topic }}</button></li></ol><p v-if="selectedTech" class="notice">已选择“{{ selectedTech }}”，当前展示演示专题，详情接口待接入。</p><h3>本周推荐阅读</h3><RouterLink v-for="article in recommendations" :key="article.id" :to="{ path: '/frontier', query: { article: article.id } }">{{ article.title }}</RouterLink></aside>
    </section>
    <div class="editorial-layout">
      <section>
        <div class="section-heading"><div><span class="eyebrow">编辑精选</span><h2>最新资讯</h2></div></div>
        <div class="editorial-list"><RouterLink v-for="(article, index) in filtered.slice(0, visible)" :key="article.id" class="editorial-item" :to="{ path: '/frontier', query: { article: article.id } }"><CategoryCover :title="article.title" :variant="article.coverVariant" :icon="article.icon" /><div><span class="tag">{{ article.category }}</span><h3>{{ article.title }}</h3><p>{{ article.summary }}</p><small>{{ article.publishedAt }} · {{ article.readMinutes }} 分钟阅读 · {{ 3280 - index * 217 }} 次阅读 · 演示资讯</small></div></RouterLink></div>
        <button v-if="visible < articles.length" class="button secondary full-width" type="button" @click="visible = articles.length">加载更多</button>
      </section>
      <aside class="study-aside"><h3>本周值得了解</h3><div class="tech-list"><button v-for="tech in technologies[category]" :key="tech" type="button" @click="selectedTech = tech">{{ tech }}<span>用 3 分钟了解 →</span></button></div><p v-if="selectedTech" class="notice">“{{ selectedTech }}”技术卡已选中，完整阅读页不在本轮范围。</p><div class="newsletter"><span class="eyebrow">AI 前沿周报</span><h3>每周一封技术摘要</h3><p>当前只进行前端邮箱校验，不会伪造真实订阅。</p><form @submit.prevent="subscribe"><input v-model="email" required type="email" placeholder="你的邮箱" aria-label="订阅邮箱" /><button class="button primary full-width" type="submit">验证订阅</button></form><p v-if="subscribed" role="status">邮箱格式有效，订阅接口待接入。</p></div></aside>
    </div>
    <section><div class="section-heading"><h2>深度洞察</h2></div><div class="four-grid"><ArticleCard v-for="article in articles.slice(0, 4)" :key="article.id" :article="article" @open="openArticle" /></div></section>
  </div>
  <ArticleDetailPanel v-model="articleOpen" :article="selectedArticle" :missing="articleOpen && !selectedArticle" />
</template>
