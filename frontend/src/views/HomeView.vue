<script setup lang="ts">
import CourseCard from '../components/CourseCard.vue'
import CategoryCover from '../components/base/CategoryCover.vue'
import LabCard from '../components/cards/LabCard.vue'
import ProjectCard from '../components/cards/ProjectCard.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { articles, assets, courses, labs, makerProjects, resources, studentActivities } from '../data/mock'
import { quizBridge } from '../services/quizBridge'

const abilities = [
  ['01', '理解', '建立 AI 概念与方法的结构化认知。'],
  ['02', '探索', '跟踪前沿趋势与真实应用边界。'],
  ['03', '实践', '在受控环境完成操作与项目。'],
  ['04', '验证', '用测评和成果检查学习效果。'],
]
const directions = ['大模型 LLM', 'AI Agent', '图像生成', '模型部署', '智能硬件', 'AI 安全']
</script>

<template>
  <div class="page-container home-page">
    <section class="home-hero">
      <div class="hero-copy">
        <span class="eyebrow">面向高校学生的 AI 学习与实训平台</span>
        <h1>学 <em>AI</em>，不止是听懂。<br />还要亲手<em>做出来</em>。</h1>
        <p>从基础知识、前沿趋势，到模型部署、AI Agent、命令行与智能硬件实践，在低门槛环境中完成“学习—实践—验证”。</p>
        <div class="hero-actions"><RouterLink class="button primary" to="/topics">开始学习</RouterLink><RouterLink class="button secondary" to="/labs">查看实训项目</RouterLink></div>
        <small>演示数据：已有 25,642 名同学加入学习</small>
      </div>
      <div class="hero-visual">
        <img :src="assets.heroCampus" alt="AI 学习、工作流与算力模块组成的 3D 插画" />
        <span class="floating-label label-one">Build</span><span class="floating-label label-two">Learn</span><span class="floating-label label-three">Explore</span>
      </div>
    </section>

    <section class="section-grid ability-section">
      <div>
        <div class="section-heading"><div><span class="eyebrow">学习方法</span><h2>一处学习，四种能力</h2></div></div>
        <div class="ability-list">
          <article v-for="[number, title, text] in abilities" :key="number"><strong>{{ number }}</strong><div><h3>{{ title }}</h3><p>{{ text }}</p></div></article>
        </div>
      </div>
      <div>
        <div class="section-heading"><div><span class="eyebrow">主题导航</span><h2>找到你感兴趣的 AI 方向</h2></div><RouterLink to="/topics">查看全部主题 →</RouterLink></div>
        <div class="direction-grid">
          <RouterLink v-for="(direction, index) in directions" :key="direction" :to="{ path: '/topics', query: { category: direction } }">
            <span class="direction-icon">{{ ['▱', '⌘', '◇', '⬡', '▦', '◈'][index] }}</span><strong>{{ direction }}</strong><small>{{ 14 + index * 2 }} 门课程 · {{ 5 + index }}k 人学习 · {{ 2 + index }} 小时</small><span>进入主题 →</span>
          </RouterLink>
        </div>
      </div>
    </section>

    <section>
      <div class="section-heading"><div><span class="eyebrow">本周精选</span><h2>值得投入时间的内容</h2></div><RouterLink to="/topics">查看全部内容 →</RouterLink></div>
      <div class="featured-grid">
        <article class="featured-course">
          <div><span class="tag orange">精选课程</span><h2>从零理解大语言模型</h2><p>原理、训练与应用全链路解析，用一门课建立可靠的模型认知。</p><div class="meta"><span>中级</span><span>6 章</span><span>90 分钟</span></div><ProgressBar :value="60" label="学习进度" /><RouterLink class="button primary" to="/courses/llm-zero">继续课程</RouterLink></div>
          <img :src="assets.learningCover" alt="大语言模型层叠知识方块插画" loading="lazy" />
        </article>
        <CourseCard v-for="course in courses.slice(1, 5)" :key="course.id" :course="course" compact />
      </div>
    </section>

    <section>
      <div class="section-heading"><div><span class="eyebrow">模拟实训</span><h2>真正动手，而不仅仅是看视频</h2></div><RouterLink to="/labs">查看全部实验 →</RouterLink></div>
      <div class="four-grid">
        <LabCard v-for="lab in labs.slice(0, 4)" :key="lab.id" :lab="lab" />
      </div>
    </section>

    <section>
      <div class="section-heading"><div><span class="eyebrow">创客项目</span><h2>把知识组合成一个作品</h2></div><RouterLink to="/labs">查看全部项目 →</RouterLink></div>
      <div class="three-grid maker-projects"><ProjectCard v-for="project in makerProjects" :key="project.id" :project="project" /></div>
    </section>

    <section>
      <div class="section-heading"><div><span class="eyebrow">AI 世界</span><h2>本周更新</h2></div><RouterLink to="/frontier">进入 AI 前沿 →</RouterLink></div>
      <div class="home-frontier-grid">
        <article class="home-focus-article"><CategoryCover :title="articles[0].title" :variant="articles[0].coverVariant" :icon="articles[0].icon" /><div><span class="tag orange">焦点文章</span><h3>{{ articles[0].title }}</h3><p>{{ articles[0].summary }}</p><RouterLink :to="{ path: '/frontier', query: { article: articles[0].id } }">阅读更多 →</RouterLink></div></article>
        <div class="article-list"><RouterLink v-for="article in articles.slice(1, 4)" :key="article.id" :to="{ path: '/frontier', query: { article: article.id } }"><span class="tag">{{ article.category }}</span><strong>{{ article.title }}</strong><small>{{ article.readMinutes }} 分钟阅读</small></RouterLink></div>
        <aside class="frontier-topic-card"><span class="eyebrow">专题推荐</span><h3>本周值得了解的 AI Agent 技术</h3><ol><li>工具调用</li><li>记忆与上下文</li><li>任务规划</li><li>多智能体协作</li></ol><RouterLink class="button secondary" to="/frontier">深入了解</RouterLink></aside>
      </div>
    </section>

    <section>
      <div class="section-heading"><div><span class="eyebrow">知识工具箱</span><h2>工具、模板和资料，都放在这里</h2></div><RouterLink to="/resources">进入资源中心 →</RouterLink></div>
      <div class="home-tools-grid"><div class="resource-strip"><RouterLink v-for="resource in resources.slice(0, 6)" :key="resource.id" :to="{ path: '/resources', query: { preview: resource.id } }"><span :class="`format ${resource.format.toLowerCase()}`">{{ resource.format }}</span><strong>{{ resource.title }}</strong><small>{{ resource.category }}</small></RouterLink></div><aside class="challenge-card"><span class="eyebrow">本周 AI 能力挑战</span><h2>用 30 道题检验学习效果</h2><p>预计 20 分钟 · 演示挑战入口</p><button class="button primary" type="button" @click="quizBridge.startChallenge('weekly-ai')">开始挑战</button></aside></div>
    </section>

    <section class="growth-section">
      <div><span class="eyebrow">学习成长</span><h2>用数字记录你的进步</h2></div>
      <div class="stat-row"><article><strong>128.6<small>h</small></strong><span>累计学习时长</span></article><article><strong>24<small>门</small></strong><span>完成课程</span></article><article><strong>18<small>个</small></strong><span>完成实验</span></article><article><strong>86<small>%</small></strong><span>测评正确率</span></article><article><strong>12<small>枚</small></strong><span>获得徽章</span></article></div>
      <article class="growth-radar-card"><strong>我的 AI 能力</strong><svg viewBox="0 0 180 160" role="img" aria-label="学习成长能力雷达图"><polygon points="90,14 158,54 148,132 90,150 30,126 20,54" fill="none" stroke="#ddd6ee" /><polygon points="90,32 140,62 132,118 90,134 44,116 38,62" fill="rgba(110,91,255,.22)" stroke="#6e5bff" stroke-width="3" /></svg><span>基础认知 82% · 工具应用 70%</span></article>
    </section>

    <section>
      <div class="section-heading"><div><span class="eyebrow">校园动态</span><h2>同学们正在完成这些事情</h2></div></div>
      <div class="student-activity-grid"><article v-for="activity in studentActivities" :key="`${activity.student}-${activity.action}`"><span class="avatar">{{ activity.student[0] }}</span><div><strong>{{ activity.student }}</strong><p>{{ activity.action }}</p><small>{{ activity.time }}</small></div><em>{{ activity.points }}</em></article></div>
    </section>

    <section class="bottom-cta"><div><span>从学会一个概念，</span><h2>到做出一个 AI 项目</h2><p>今天开始，建立属于你的 AI 能力路径。</p></div><div><RouterLink class="button primary" to="/topics">免费开始学习</RouterLink><RouterLink class="button secondary" to="/labs">浏览实训项目</RouterLink></div></section>
  </div>
</template>
