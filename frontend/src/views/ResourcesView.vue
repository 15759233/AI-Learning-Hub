<script setup lang="ts">
import { computed, ref } from 'vue'
import ContentCard from '../components/ContentCard.vue'
import PageHero from '../components/PageHero.vue'
import { assets, resources } from '../data/mock'
import { useLearningStore } from '../stores/learning'

const store = useLearningStore()
const query = ref('')
const category = ref('全部资源')
const theme = ref('全部主题')
const difficulty = ref('全部难度')
const format = ref('全部格式')
const sort = ref('最新发布')
const featuredOnly = ref(false)
const preview = ref<(typeof resources)[number]>()
const uploadOpen = ref(false)
const uploadStatus = ref('')
const categories = ['全部资源', '学习手册', '提示词模板', '部署指南', 'Agent 案例', '命令速查', '硬件资料']
const filtered = computed(() => {
  const result = resources.filter((item) =>
    item.title.includes(query.value) &&
    (category.value === '全部资源' || item.category === category.value) &&
    (theme.value === '全部主题' || item.theme === theme.value) &&
    (difficulty.value === '全部难度' || item.difficulty === difficulty.value) &&
    (format.value === '全部格式' || item.format === format.value) &&
    (!featuredOnly.value || item.featured))
  return sort.value === '下载最多' ? [...result].sort((a, b) => b.downloads - a.downloads) : [...result].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
})
const favoriteResources = computed(() => resources.filter((item) => store.favorites.includes(item.id)))
const submitUpload = () => {
  uploadStatus.value = '演示模式：表单已通过前端校验，未向服务器上传文件。'
}
</script>

<template>
  <div class="page-container">
    <PageHero title="资源中心" description="汇集学习手册、提示词模板、部署指南、Agent 案例、命令速查和硬件资料。" :image="assets.learningCover">
      <form class="hero-search" @submit.prevent><input v-model="query" aria-label="搜索资源" placeholder="搜索资源名称…" /><button class="button primary">搜索</button></form>
    </PageHero>
    <div class="category-tabs" role="tablist"><button v-for="item in categories" :key="item" type="button" :class="{ active: category === item }" @click="category = item">{{ item }}</button></div>
    <section class="featured-resources"><div class="section-heading"><div><span class="eyebrow">精选推荐</span><h2>精选资源推荐</h2></div></div><div class="featured-resource-row"><button v-for="item in resources.filter((resource) => resource.featured).slice(0, 4)" :key="item.id" type="button" @click="preview = item"><img :src="assets.learningCover" :alt="`${item.title}精选资源封面`" loading="lazy" /><span><small>{{ item.theme }} · {{ item.format }}</small><strong>{{ item.title }}</strong><em>预览资源 →</em></span></button></div></section>
    <div class="resource-layout">
      <section>
        <div class="catalog-toolbar resource-toolbar"><strong>{{ category }} <small>共 {{ filtered.length }} 个演示资源</small></strong><label>资源类型<select v-model="category"><option v-for="item in categories" :key="item">{{ item }}</option></select></label><label>主题<select v-model="theme"><option>全部主题</option><option>大模型</option><option>Agent</option><option>编程工具</option><option>智能硬件</option></select></label><label>难度<select v-model="difficulty"><option>全部难度</option><option>入门</option><option>中级</option><option>进阶</option></select></label><label>格式<select v-model="format"><option>全部格式</option><option>PDF</option><option>DOCX</option><option>PPTX</option><option>ZIP</option><option>TXT</option></select></label><label>排序<select v-model="sort"><option>最新发布</option><option>下载最多</option></select></label><label class="check-label"><input v-model="featuredOnly" type="checkbox" />仅看精选</label></div>
        <div v-if="filtered.length" class="card-grid three"><ContentCard v-for="item in filtered" :key="item.id" :id="item.id" :title="item.title" :description="`${item.format} · ${item.difficulty} · 更新于 ${item.updatedAt}`" :meta="`${item.theme} · ${item.downloads.toLocaleString()} 次下载`" kind="resource" action="预览资源" @action="preview = item" /></div>
        <div v-else class="inline-empty"><h3>当前筛选下没有资源</h3><p>切换分类或关闭精选筛选。</p></div>
        <section class="recent-table"><div class="section-heading"><h2>最近更新</h2></div><div class="table-row table-head"><span>资源名称</span><span>类型</span><span>主题</span><span>更新时间</span><span>下载次数</span><span>收藏</span></div><div v-for="item in resources.slice(0, 6)" :key="item.id" class="table-row"><button class="table-title" type="button" @click="preview = item"><strong>{{ item.title }}</strong><small>{{ item.format }}</small></button><span>{{ item.category }}</span><span>{{ item.theme }}</span><span>{{ item.updatedAt }}</span><span>{{ item.downloads.toLocaleString() }}</span><button class="icon-button" type="button" :aria-label="`${store.favorites.includes(item.id) ? '取消收藏' : '收藏'}${item.title}`" @click="store.toggleFavorite(item.id)">{{ store.favorites.includes(item.id) ? '★' : '☆' }}</button></div></section>
      </section>
      <aside class="study-aside"><h3>热门下载</h3><ol class="rank-list"><li v-for="item in [...resources].sort((a, b) => b.downloads - a.downloads).slice(0, 5)" :key="item.id"><button type="button" @click="preview = item">{{ item.title }}</button><small>{{ item.downloads }} 次</small></li></ol><h3>我的收藏</h3><div v-if="favoriteResources.length" class="resource-favorites"><button v-for="item in favoriteResources.slice(0, 4)" :key="item.id" type="button" @click="preview = item">{{ item.title }}<small>{{ item.format }}</small></button></div><p v-else>还没有收藏资源，可在资源卡右下角添加。</p><h3>资源共建</h3><p>欢迎提交你整理的学习资源。首版只做表单校验，不会伪造服务器上传。</p><button class="button primary full-width" type="button" @click="uploadOpen = true">上传资源</button><h3>使用小贴士</h3><p>资源中的链接与文件均为演示内容，真实下载接口待后端接入。</p></aside>
    </div>
  </div>
  <dialog :open="!!preview" class="search-dialog" @close="preview = undefined"><div class="dialog-card"><div class="dialog-title"><strong>{{ preview?.title }}</strong><button class="icon-button" type="button" @click="preview = undefined">×</button></div><img :src="assets.learningCover" alt="资源预览插画" class="dialog-preview" /><p>{{ preview?.format }} · {{ preview?.category }}</p><div class="notice">演示资源：暂无真实文件，不会触发无效下载。</div><button class="button secondary" type="button" disabled>下载接口待接入</button></div></dialog>
  <dialog :open="uploadOpen" class="search-dialog" @close="uploadOpen = false"><form class="dialog-card" @submit.prevent="submitUpload"><div class="dialog-title"><strong>共享学习资源</strong><button class="icon-button" type="button" @click="uploadOpen = false">×</button></div><label>资源名称<input required maxlength="60" /></label><label>资源类型<select required><option>学习手册</option><option>提示词模板</option><option>部署指南</option></select></label><label>文件<input required type="file" accept=".pdf,.docx,.pptx,.zip,.txt" /></label><button class="button primary" type="submit">验证提交</button><p v-if="uploadStatus" role="status">{{ uploadStatus }}</p></form></dialog>
</template>
