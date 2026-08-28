<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import { Terminal } from '@xterm/xterm'
import ProgressBar from '../components/ProgressBar.vue'
import { assets, resources } from '../data/mock'
import { useLearningStore } from '../stores/learning'

type LabState = 'idle' | 'ready' | 'running' | 'success' | 'failed' | 'stopped' | 'submitted'

const store = useLearningStore()
const state = ref<LabState>('ready')
const activeStep = ref(2)
const activeTab = ref<'工作台' | '代码' | '设置'>('工作台')
const guidanceOpen = ref(true)
const input = ref('帮我查询明天的校园天气，并告诉我是否适合户外活动。')
const output = ref('等待运行 Agent…')
const score = ref(0)
const terminalHost = ref<HTMLElement>()
const workspaceHost = ref<HTMLElement>()
const mockInputNotice = ref('')
const { fitView, zoomIn, zoomOut } = useVueFlow()
let terminal: Terminal | undefined
let runTimer: number | undefined
let logIndex = 0

const steps = ['环境准备', '需求分析', 'Agent 设计', '工具配置', '测试与调优', '发布与评估']
const logs = ['[ready] 初始化受控 Agent 环境', '[plan] 识别用户意图与约束', '[tool] 调用白名单工具：天气查询', '[result] 工具返回演示数据', '[done] 已生成带安全提示的回答']
const nodes = ref<Node[]>([
  { id: 'start', position: { x: 30, y: 150 }, data: { label: '用户输入' }, type: 'input' },
  { id: 'intent', position: { x: 210, y: 70 }, data: { label: '意图识别' } },
  { id: 'plan', position: { x: 210, y: 230 }, data: { label: '任务规划' } },
  { id: 'tool', position: { x: 410, y: 70 }, data: { label: '工具调用' } },
  { id: 'result', position: { x: 410, y: 230 }, data: { label: '结果生成' } },
  { id: 'end', position: { x: 610, y: 150 }, data: { label: '返回结果' }, type: 'output' },
])
const edges = ref<Edge[]>([
  { id: 'e1', source: 'start', target: 'intent', animated: true },
  { id: 'e2', source: 'start', target: 'plan' },
  { id: 'e3', source: 'intent', target: 'tool' },
  { id: 'e4', source: 'plan', target: 'result' },
  { id: 'e5', source: 'tool', target: 'end' },
  { id: 'e6', source: 'result', target: 'end' },
])

const running = computed(() => state.value === 'running')
const progress = computed(() => state.value === 'success' || state.value === 'submitted' ? 75 : state.value === 'running' ? 68 : 60)

const writeLine = (message: string) => terminal?.writeln(`\x1b[32m${message}\x1b[0m`)
const stopTimer = () => {
  window.clearInterval(runTimer)
  runTimer = undefined
}
const run = () => {
  if (running.value) return
  state.value = 'running'
  score.value = 0
  output.value = 'Agent 正在分析任务…'
  terminal?.clear()
  logIndex = 0
  writeLine(logs[logIndex++])
  runTimer = window.setInterval(() => {
    writeLine(logs[logIndex])
    logIndex += 1
    if (logIndex >= logs.length) {
      stopTimer()
      state.value = 'success'
      score.value = 86
      output.value = '演示结果：明天校园天气温和，适合户外活动；请以学校发布的实际天气信息为准。'
      store.setLabProgress('agent-workbench', 75)
    }
  }, 650)
}
const stop = () => {
  if (!running.value) return
  stopTimer()
  state.value = 'stopped'
  output.value = '运行已安全停止，可重新执行。'
  terminal?.writeln('\x1b[33m[stopped] 用户停止了模拟运行\x1b[0m')
}
const reset = () => {
  stopTimer()
  state.value = 'ready'
  score.value = 0
  output.value = '等待运行 Agent…'
  terminal?.clear()
  writeLine('[ready] 实验已重置')
}
const autoLayout = () => {
  const positions = [[30, 150], [210, 70], [210, 230], [410, 70], [410, 230], [610, 150]]
  nodes.value = nodes.value.map((node, index) => ({ ...node, position: { x: positions[index][0], y: positions[index][1] } }))
  window.setTimeout(() => fitView({ padding: 0.15 }), 0)
}
const toggleFullscreen = async () => {
  if (!workspaceHost.value) return
  if (document.fullscreenElement) await document.exitFullscreen()
  else await workspaceHost.value.requestFullscreen()
}
const setMockInputNotice = (message: string) => {
  mockInputNotice.value = message
  window.setTimeout(() => { mockInputNotice.value = '' }, 2200)
}
const submit = () => {
  if (state.value !== 'success') return
  state.value = 'submitted'
  terminal?.writeln('\x1b[36m[submitted] 演示实验报告已在本地标记提交\x1b[0m')
}

onMounted(async () => {
  await nextTick()
  if (!terminalHost.value) return
  terminal = new Terminal({ rows: 7, fontSize: 13, theme: { background: '#07111d', foreground: '#b8f7cc' }, disableStdin: true })
  terminal.open(terminalHost.value)
  writeLine('[ready] 这是白名单驱动的模拟终端，不连接真实 Shell')
})
onBeforeUnmount(() => {
  stopTimer()
  terminal?.dispose()
})
</script>

<template>
  <div class="lab-page">
    <div class="page-container">
      <section class="lab-hero">
        <div><RouterLink class="back-link" to="/labs">← 返回实训项目</RouterLink><span class="tag purple">进阶实训</span><h1>AI Agent 智能助手开发实训</h1><p>构建一个能理解问题、规划步骤并调用白名单工具解决问题的智能 Agent。</p><div class="meta"><span>难度 ●●●○</span><span>预计 110 分钟</span></div><ProgressBar :value="progress" label="学习进度" dark /></div>
        <img :src="assets.labCover" alt="AI Agent 工作流实训 3D 插画" />
        <div class="lab-hero-actions"><button class="button lab-secondary" type="button" @click="reset">重新开始</button><button class="button lab-secondary" type="button" @click="store.toggleFavorite('agent-workbench')">{{ store.favorites.includes('agent-workbench') ? '已收藏' : '收藏实验' }}</button><button class="button primary" type="button" @click="run">继续实验</button></div>
      </section>
      <div class="workspace-layout">
        <aside class="step-panel">
          <div class="panel-title"><strong>实验步骤</strong><span>共 6 步</span></div>
          <button v-for="(step, index) in steps" :key="step" type="button" :class="{ active: activeStep === index + 1, done: index + 1 < activeStep }" @click="activeStep = index + 1"><strong>{{ String(index + 1).padStart(2, '0') }}</strong><span>{{ step }}</span><small>{{ index + 1 < activeStep ? '已完成' : index + 1 === activeStep ? '进行中' : `${10 + index * 5} 分钟` }}</small></button>
          <button class="report-link" type="button" :disabled="state !== 'success'" title="运行成功后可提交实验报告" @click="submit">▤ 实验报告</button>
        </aside>
        <section ref="workspaceHost" class="workspace-main">
          <div class="workspace-tabs"><button v-for="tab in ['工作台', '代码', '设置'] as const" :key="tab" type="button" :class="{ active: activeTab === tab }" @click="activeTab = tab">{{ tab }}</button></div>
          <template v-if="activeTab === '工作台'">
            <div class="flow-toolbar"><strong>Agent 工作流设计</strong><span></span><button type="button" @click="autoLayout">自动布局</button><button type="button" aria-label="缩小工作流画布" @click="zoomOut()">－</button><button type="button" aria-label="放大工作流画布" @click="zoomIn()">＋</button><button type="button" @click="fitView({ padding: 0.15 })">适应画布</button><button type="button" @click="toggleFullscreen">全屏</button></div>
            <div class="flow-canvas"><VueFlow v-model:nodes="nodes" v-model:edges="edges" :min-zoom="0.5" :max-zoom="1.8" fit-view-on-init /></div>
            <div class="terminal-header"><strong>运行面板</strong><span :class="`status ${state}`">{{ state }}</span><button v-if="running" type="button" @click="stop">■ 停止运行</button><button v-else type="button" @click="run">▶ {{ state === 'success' ? '重新运行' : '运行 Agent' }}</button><button type="button" @click="terminal?.clear()">清空</button></div>
            <div ref="terminalHost" class="terminal-host" aria-label="受控模拟终端输出" />
            <div class="io-grid"><label>输入（用户问题）<textarea v-model="input" rows="5" maxlength="500" /><small>{{ input.length }}/500 · 仅用于模拟状态机</small></label><div><strong>输出（Agent 回复）</strong><p>{{ output }}</p><small v-if="score">本次评分：{{ score }} / 100</small></div></div>
            <div class="mock-input-actions"><button type="button" @click="setMockInputNotice('演示模式：已识别文件选择入口，未向服务器上传。')">上传文件</button><button type="button" @click="setMockInputNotice('演示模式：语音输入接口待接入，未访问麦克风。')">语音输入</button><span v-if="mockInputNotice" role="status">{{ mockInputNotice }}</span></div>
            <div class="toolbox"><strong>工具箱</strong><span>天气查询 · 已启用</span><span>网页搜索 · 演示</span><span>计算器 · 已启用</span><button type="button" disabled title="首版仅开放预设白名单工具">＋ 添加工具</button></div>
          </template>
          <div v-else-if="activeTab === '代码'" class="workspace-placeholder"><h2>代码结构预览</h2><pre>agent.plan(input)\nagent.callAllowedTool('weather')\nagent.respond(result)</pre><p>首版不开放真实代码执行。</p></div>
          <div v-else class="workspace-placeholder"><h2>实验设置</h2><label>最大模拟步骤 <input type="number" value="6" min="1" max="8" /></label><p>所有设置仅影响前端状态机。</p></div>
        </section>
        <aside class="guidance-panel" :class="{ closed: !guidanceOpen }">
          <button class="outline-title" type="button" @click="guidanceOpen = !guidanceOpen"><strong>任务指导</strong><span>{{ guidanceOpen ? '收起' : '展开' }}</span></button>
          <template v-if="guidanceOpen"><section><h3>任务描述</h3><p>设计一个能够识别问题、规划任务并调用天气工具的 Agent。</p></section><section><h3>任务目标</h3><ol><li>完成 6 个流程节点。</li><li>配置 2 个白名单工具。</li><li>运行并检查输出。</li></ol></section><section><h3>提示与建议</h3><p>先明确意图，再选择工具；输出需要说明信息边界。</p></section><section><h3>评分标准</h3><ProgressBar :value="state === 'success' || state === 'submitted' ? 86 : 35" dark /><p>流程 30 · 工具 30 · 结果 20 · 安全 20</p></section><section><h3>实时反馈</h3><p><span class="status-dot" />当前状态：{{ state }}</p><p v-if="state === 'success'">Agent 运行已完成，结果符合安全边界。</p></section></template>
        </aside>
      </div>
      <section class="lab-related"><div class="section-heading"><div><span class="eyebrow">学习辅助</span><h2>相关资源</h2></div><RouterLink to="/resources">查看全部资源 →</RouterLink></div><div class="five-resource-grid"><RouterLink v-for="resource in resources.slice(0, 5)" :key="resource.id" to="/resources"><span :class="`format ${resource.format.toLowerCase()}`">{{ resource.format }}</span><strong>{{ resource.title }}</strong><p>{{ resource.theme }} · {{ resource.difficulty }}</p><small>演示资源 · 查看详情 →</small></RouterLink></div></section>
      <section class="lab-result"><div><span class="eyebrow">实验成绩</span><h2>{{ score || '--' }} <small>/ 100</small></h2><p>{{ state === 'submitted' ? '报告已在演示模式提交。' : '运行成功后可提交实验报告。' }}</p><span class="result-badge">◆ 成就徽章：Agent 实践者</span></div><div class="radar simple-radar"><span>流程</span><span>工具</span><span>安全</span><span>结果</span></div><div class="result-actions"><button class="button lab-secondary" type="button" @click="guidanceOpen = true">查看成绩详情</button><button class="button primary" type="button" :disabled="state !== 'success'" @click="submit">提交实验报告</button></div></section>
      <section class="lab-bottom-actions"><div><span class="eyebrow">实验完成后</span><h3>别忘了提交实验报告</h3><button class="button primary" type="button" :disabled="state !== 'success'" @click="submit">去提交报告</button></div><div class="quick-links"><strong>快捷入口</strong><button type="button" :disabled="state !== 'success'" @click="submit">实验报告</button><button type="button" @click="activeTab = '代码'">我的代码</button><button type="button" @click="store.toggleFavorite('agent-workbench')">{{ store.favorites.includes('agent-workbench') ? '取消收藏' : '我的收藏' }}</button><button type="button" @click="activeTab = '设置'">学习笔记</button></div><div><span class="eyebrow">下一步推荐</span><h3>模型部署服务实训</h3><p>把 Agent 应用接入受控的模型服务流程。</p><RouterLink class="button lab-secondary" to="/labs/model-service">开始学习</RouterLink></div></section>
    </div>
  </div>
</template>
