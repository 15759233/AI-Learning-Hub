<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import CourseCard from '../components/CourseCard.vue'
import AppDialog from '../components/base/AppDialog.vue'
import NotFoundState from '../components/NotFoundState.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { assets, courses } from '../data/mock'
import { useLearningStore } from '../stores/learning'

const route = useRoute()
const router = useRouter()
const store = useLearningStore()
const course = computed(() => courses.find((item) => item.id === route.params.courseId))
const courseId = computed(() => String(route.params.courseId))
const currentLesson = ref(Math.min(5, Math.max(1, Number(route.query.lesson) || 2)))
const expanded = ref(true)
const selectedAnswer = ref('')
const submitted = ref(false)
const copyMessage = ref('复制代码')
const followed = ref(false)
const noteOpen = ref(false)
const noteDraft = ref(store.notes[courseId.value] || '')
const videoMessage = ref('▶ 12:40 · 演示视频占位')
const liked = ref(false)
const questionSent = ref(false)
const lessons = ['AI 与语言模型', 'Transformer 核心结构', '训练与微调', '推理与应用', '安全与伦理']
const code = `from transformers import pipeline\n\nassistant = pipeline("text-generation")\nresult = assistant("解释注意力机制：", max_new_tokens=80)\nprint(result[0]["generated_text"])`

const submitQuiz = () => {
  if (selectedAnswer.value) submitted.value = true
}
const copyCode = async () => {
  try {
    await navigator.clipboard.writeText(code)
    copyMessage.value = '已复制'
  } catch {
    copyMessage.value = '复制失败，请手动选择代码'
  }
  window.setTimeout(() => { copyMessage.value = '复制代码' }, 1800)
}
const saveNote = () => {
  store.saveNote(courseId.value, noteDraft.value)
  noteOpen.value = false
}
const recommendations = computed(() => courses.filter((item) => item.id !== courseId.value).slice(0, 4))
watch(currentLesson, (lesson) => {
  router.replace({ query: { ...route.query, lesson: String(lesson) } })
})
watch(courseId, () => {
  currentLesson.value = Math.min(5, Math.max(1, Number(route.query.lesson) || 1))
  noteDraft.value = store.notes[courseId.value] || ''
})
</script>

<template>
  <NotFoundState v-if="!course" title="没有找到这门课程" description="未知 courseId 不会回退到其他课程，请返回学习主题重新选择。" back-to="/topics" back-label="返回学习主题" />
  <div v-else class="page-container">
    <section class="course-hero">
      <div class="hero-copy"><span class="tag purple">{{ course.category }}</span><h1>{{ course.title }}</h1><p>{{ course.description }} 从核心概念出发，逐步走向受控实践。</p><div class="meta"><span>{{ course.level }}</span><span>5 章 · 18 节</span><span>{{ course.learners.toLocaleString() }} 人学习</span><span>4.9 分</span></div><div class="teacher"><span class="avatar">林</span><div><strong>林知远老师</strong><small>高校 AI 应用课程讲师</small></div><button class="button secondary small" type="button" @click="followed = !followed">{{ followed ? '已关注' : '关注' }}</button></div></div>
      <img :src="assets.learningCover" :alt="`${course.title}课程插画`" />
      <aside class="hero-progress"><ProgressBar :value="store.courseProgress[course.id] ?? course.progress ?? 0" label="学习进度" /><strong>已学 {{ currentLesson }} / {{ lessons.length }} 课时</strong><button class="button primary full-width" type="button" @click="store.completeCourseStep(course.id, currentLesson, lessons.length)">完成本节</button><button class="button secondary full-width" type="button" @click="store.toggleFavorite('course', course.id)">{{ store.isFavorite('course', course.id) ? '已收藏' : '收藏课程' }}</button></aside>
    </section>
    <div class="learning-layout">
      <aside class="outline-panel sticky">
        <button class="outline-title" type="button" @click="expanded = !expanded"><strong>课程大纲</strong><span>{{ expanded ? '收起' : '展开' }}</span></button>
        <div v-if="expanded" class="lesson-list"><button v-for="(lesson, index) in lessons" :key="lesson" type="button" :class="{ done: index < currentLesson - 1, active: index === currentLesson - 1 }" @click="currentLesson = index + 1"><span>{{ index < currentLesson - 1 ? '✓' : String(index + 1).padStart(2, '0') }}</span>{{ lesson }}</button></div>
        <div class="certificate-card">完成全部课程可获得<br /><strong>大模型基础证书</strong></div>
      </aside>
      <article class="lesson-content">
        <div class="lesson-nav"><button type="button" :disabled="currentLesson === 1" @click="currentLesson--">← 上一节</button><strong>第 {{ currentLesson }} 节</strong><button type="button" :disabled="currentLesson === lessons.length" @click="currentLesson++">下一节 →</button></div>
        <span class="eyebrow">核心概念</span><h2>{{ lessons[currentLesson - 1] }}</h2><p>Transformer 通过注意力机制理解序列中不同位置之间的关系。与逐步处理的传统结构相比，它能并行处理信息，并在大规模数据上形成更稳定的表示能力。</p>
        <div class="concept-diagram"><div>输入序列</div><span>→</span><div>注意力</div><span>→</span><div>前馈网络</div><span>→</span><div>上下文表示</div></div>
        <div class="video-placeholder"><img :src="assets.learningCover" alt="课程视频封面插画" /><button type="button" aria-label="播放演示视频" @click="videoMessage = '暂无真实视频，当前为课程封面预览'">{{ videoMessage }}</button></div>
        <section class="code-card"><div><span>Python</span><button type="button" @click="copyCode">{{ copyMessage }}</button></div><pre><code>{{ code }}</code></pre></section>
        <div class="key-grid"><article><strong>并行计算</strong><p>减少序列处理的依赖。</p></article><article><strong>上下文关联</strong><p>学习远距离信息关系。</p></article><article><strong>规模扩展</strong><p>支持更大数据与模型。</p></article></div>
        <section class="quiz-card"><span class="eyebrow">知识小测</span><h3>注意力机制主要解决什么问题？</h3><label v-for="answer in ['捕捉序列中不同位置的关联', '直接连接真实服务器', '替代所有数据清洗']" :key="answer" :class="{ selected: selectedAnswer === answer }"><input v-model="selectedAnswer" type="radio" name="answer" :value="answer" />{{ answer }}</label><button class="button primary" type="button" :disabled="!selectedAnswer || submitted" @click="submitQuiz">{{ submitted ? '已提交' : '提交答案' }}</button><p v-if="submitted" :class="selectedAnswer.startsWith('捕捉') ? 'answer-correct' : 'answer-wrong'"><strong>本题得分：{{ selectedAnswer.startsWith('捕捉') ? 100 : 0 }}</strong><br />{{ selectedAnswer.startsWith('捕捉') ? '回答正确。注意力会计算不同位置之间的相关程度。' : '回答不正确。请回顾“上下文关联”部分。' }}</p></section>
        <div class="lesson-actions"><button type="button" @click="noteOpen = true">记录笔记</button><button type="button" @click="questionSent = !questionSent">{{ questionSent ? '问题已记录' : '向老师提问' }}</button><button type="button" :class="{ active: liked }" @click="liked = !liked">{{ liked ? '已点赞' : '点赞本节' }}</button></div>
      </article>
      <aside class="lesson-aside sticky">
        <section><div class="panel-title"><strong>我的笔记</strong><button type="button" @click="noteOpen = true">编辑</button></div><p>{{ store.notes[course.id] || '还没有笔记，记录一个关键想法吧。' }}</p></section>
        <section><h3>相关资料</h3><RouterLink to="/resources">Transformer 图解 · PDF</RouterLink><RouterLink to="/resources">注意力机制学习手册</RouterLink><RouterLink to="/resources">课程视频索引 · 视频</RouterLink><RouterLink to="/resources">示例代码仓库 · GitHub</RouterLink></section>
        <section><h3>学习进度</h3><ProgressBar :value="store.courseProgress[course.id] || 0" /><small>完成本节会同步更新课程进度。</small></section>
        <section><h3>学习成就</h3><div class="mini-achievements"><span><strong>◆</strong>模型入门</span><span><strong>⬢</strong>连续学习</span><span><strong>✦</strong>小测达人</span></div></section>
        <section><h3>下一节预告</h3><strong>{{ lessons[Math.min(currentLesson, lessons.length - 1)] }}</strong><p>预计 18 分钟</p><button class="button primary full-width" type="button" :disabled="currentLesson === lessons.length" @click="currentLesson++">继续下一节</button></section>
      </aside>
    </div>
    <section><div class="section-heading"><h2>相关推荐课程</h2></div><div class="four-grid"><CourseCard v-for="item in recommendations" :key="item.id" :course="item" compact /></div></section>
  </div>
  <AppDialog v-model="noteOpen" title="本节学习笔记"><form class="dialog-form" @submit.prevent="saveNote"><textarea v-model="noteDraft" rows="7" placeholder="记录关键概念和待解决的问题…" autofocus /><button class="button primary" type="submit">保存到本地</button></form></AppDialog>
</template>
