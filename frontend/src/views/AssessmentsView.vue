<script setup lang="ts">
import { ref } from 'vue'
import AppDialog from '../components/base/AppDialog.vue'
import ProgressBar from '../components/ProgressBar.vue'
import { assessmentAchievements, assets } from '../data/mock'
import { quizBridge } from '../services/quizBridge'
import { useLearningStore } from '../stores/learning'

const store = useLearningStore()
const dimension = ref<'知识点' | '能力维度'>('知识点')
const rankTab = ref<'本周榜' | '总榜'>('本周榜')
const school = ref('全部高校')
const ruleOpen = ref(false)
const wrongOpen = ref(false)
const abilities = [
  ['机器学习基础', 82, 48], ['深度学习基础', 76, 42], ['数据分析与处理', 88, 61], ['编程与算法', 70, 39],
  ['计算机视觉', 64, 31], ['自然语言处理', 79, 45], ['数据可视化', 91, 58], ['AI 应用实践', 73, 36],
]
const startChallenge = (id: string) => {
  store.recordAssessment('challenge', id)
  quizBridge.startChallenge(id)
}
const startAssessment = (id: string) => {
  store.recordAssessment('assessment', id)
  quizBridge.startAssessment(id)
}
const startPractice = (id: string) => {
  store.recordAssessment('practice', id)
  quizBridge.startPractice(id)
}
</script>

<template>
  <div class="page-container assessment-page">
    <section class="assessment-title"><div><span class="eyebrow">学习 · 实践 · 验证</span><h1>挑战与测评</h1><p>检验学习效果，发现知识盲点，持续突破自我。</p></div><aside><strong>本周已练习 4 次</strong><ProgressBar :value="70" label="本周目标" /><button class="text-link" type="button" @click="quizBridge.openReport()">查看学习报告 →</button></aside></section>
    <section class="challenge-hero">
      <div><span class="tag purple">本周挑战</span><h2>AI 基础能力突破赛</h2><p>30 道题覆盖模型基础、数据处理、AI 应用与安全边界。</p><div class="meta"><span>12,860 人参与</span><span>剩余 3 天</span><span>奖励 300 积分</span></div><div class="hero-actions"><button class="button primary" type="button" @click="startChallenge('weekly-ai')">立即参加挑战</button><button class="button secondary" type="button" @click="ruleOpen = true">查看挑战规则</button></div></div>
      <img :src="assets.labCover" alt="AI 挑战工作流插画" />
      <div class="challenge-target"><h3>挑战目标</h3><strong>最佳准确率 86%</strong><ProgressBar :value="68" label="当前进度" /><span>当前排名：第 128 名</span><span>积分规则：答对 1 题 +10，完成挑战额外 +50</span></div>
    </section>
    <div class="assessment-grid">
      <section class="exam-card"><span class="eyebrow">全真模拟测评</span><h2>AI 综合能力测评</h2><p>60 道题 · 90 分钟 · 综合难度</p><div class="exam-stats"><span><strong>{{ store.assessmentRecords.length }}</strong>本地入口记录</span><span><strong>演示</strong>桥接状态</span><span><strong>待接入</strong>真实成绩</span></div><button class="button primary" type="button" @click="startAssessment('full-ai')">开始模拟测评</button><button class="text-link" type="button" @click="quizBridge.openReport('full-ai')">历史记录 →</button></section>
      <aside class="leaderboard"><div class="panel-title"><h3>学习排行榜</h3><div><button v-for="tab in ['本周榜', '总榜'] as const" :key="tab" type="button" :class="{ active: rankTab === tab }" @click="rankTab = tab">{{ tab }}</button></div></div><label class="rank-filter">学校筛选<select v-model="school"><option>全部高校</option><option>本校</option><option>同城高校</option></select></label><div class="podium"><span><strong>2</strong>李同学</span><span class="first"><strong>1</strong>陈同学</span><span><strong>3</strong>王同学</span></div><ol><li><span>04</span>赵同学<strong>2,780</strong></li><li><span>05</span>你<strong>2,640</strong></li></ol></aside>
    </div>
    <section>
      <div class="section-heading"><div><span class="eyebrow">能力诊断</span><h2>知识点掌握情况</h2></div><div class="segmented"><button v-for="item in ['知识点', '能力维度'] as const" :key="item" type="button" :class="{ active: dimension === item }" @click="dimension = item">{{ item }}</button></div></div>
      <div class="four-grid ability-cards"><article v-for="[title, rate, done] in abilities" :key="title"><span>{{ dimension }}</span><h3>{{ title }}</h3><strong>{{ rate }}%</strong><ProgressBar :value="Number(rate)" /><small>已完成 {{ done }} 道题</small></article></div>
    </section>
    <div class="assessment-grid">
      <section class="wrong-card"><div class="panel-title"><div><span class="eyebrow">错题回顾</span><h2>注意力机制的主要作用是？</h2></div><button class="text-link" type="button" @click="quizBridge.openWrongQuestions()">查看全部错题 →</button></div><div class="wrong-options"><span>A. 直接提升参数规模</span><span class="correct">B. 捕捉序列中不同位置的关联</span><span>C. 替代全部数据清洗</span></div><p>你的答案：A · 正确答案：B · 本题错误率 38%</p><button class="button secondary" type="button" @click="wrongOpen = true">查看解析</button></section>
      <aside class="study-aside"><h3>近期成绩</h3><div v-for="(item, index) in ['本周 AI 挑战', '大模型专项练习', 'Python 基础测评']" :key="item" class="result-row"><strong>{{ item }}</strong><span>{{ 86 - index * 4 }}% · {{ 18 + index * 4 }} 分钟</span><small>{{ index === 0 ? '第 128 名' : `${82 - index * 3} 分 · ${['A', 'B+', 'B'][index]} 级` }} · {{ index + 1 }} 天前</small></div></aside>
    </div>
    <section><div class="section-heading"><h2>推荐练习</h2></div><div class="three-grid practice-grid"><article v-for="(title, index) in ['强化学习基础', '计算机视觉入门', '模型安全边界']" :key="title"><span>薄弱项推荐</span><h3>{{ title }}</h3><p>{{ 12 + index * 3 }} 道题 · 当前正确率 {{ 62 + index * 4 }}%</p><button class="button secondary" type="button" @click="startPractice(`practice-${index}`)">开始练习</button></article></div></section>
    <section><div class="section-heading"><div><span class="eyebrow">成长记录</span><h2>我的成就</h2></div></div><div class="assessment-achievements"><article v-for="achievement in assessmentAchievements" :key="achievement.title" :class="{ locked: !achievement.unlocked }"><span>{{ achievement.icon }}</span><div><h3>{{ achievement.title }}</h3><p>{{ achievement.description }}</p><small>{{ achievement.unlocked ? '已获得' : '待解锁' }}</small></div></article></div></section>
  </div>
  <AppDialog v-model="ruleOpen" title="挑战规则"><ol><li>答题入口由《题盒》统一提供。</li><li>本页不保存题库、计时或判分逻辑。</li><li>演示入口记录只保存在当前浏览器。</li></ol></AppDialog>
  <AppDialog v-model="wrongOpen" title="错题解析"><p>注意力机制通过相关性权重聚合不同位置的信息，从而建立上下文联系。</p><button class="button primary" type="button" @click="startPractice('attention')">通过《题盒》继续练习</button></AppDialog>
</template>
