<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { VueFlow, useVueFlow, type Edge, type Node } from '@vue-flow/core'
import type { LabDefinition, LabRunState } from '../../../labs/types'

defineProps<{ definition: LabDefinition; state: LabRunState }>()
const host = ref<HTMLElement>()
const input = ref('帮我查询明天校园天气，并说明是否适合户外活动。')
const { fitView, zoomIn, zoomOut } = useVueFlow()
const nodes = ref<Node[]>([
  { id: 'start', position: { x: 30, y: 140 }, data: { label: '用户输入' }, type: 'input' },
  { id: 'intent', position: { x: 210, y: 60 }, data: { label: '意图识别' } },
  { id: 'plan', position: { x: 210, y: 220 }, data: { label: '任务规划' } },
  { id: 'tool', position: { x: 410, y: 60 }, data: { label: '工具调用' } },
  { id: 'result', position: { x: 410, y: 220 }, data: { label: '结果生成' } },
  { id: 'end', position: { x: 610, y: 140 }, data: { label: '返回结果' }, type: 'output' },
])
const edges = ref<Edge[]>([
  { id: 'e1', source: 'start', target: 'intent', animated: true },
  { id: 'e2', source: 'start', target: 'plan' },
  { id: 'e3', source: 'intent', target: 'tool' },
  { id: 'e4', source: 'plan', target: 'result' },
  { id: 'e5', source: 'tool', target: 'end' },
  { id: 'e6', source: 'result', target: 'end' },
])

const autoLayout = () => {
  const positions = [[30, 140], [210, 60], [210, 220], [410, 60], [410, 220], [610, 140]]
  nodes.value = nodes.value.map((node, index) => ({ ...node, position: { x: positions[index][0], y: positions[index][1] } }))
  nextTick(() => fitView({ padding: 0.16 }))
}
const toggleFullscreen = async () => {
  if (!host.value) return
  if (document.fullscreenElement) await document.exitFullscreen()
  else await host.value.requestFullscreen()
}
const onFullscreen = () => window.setTimeout(() => fitView({ padding: 0.16 }), 50)
onMounted(() => document.addEventListener('fullscreenchange', onFullscreen))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', onFullscreen))
</script>

<template>
  <div ref="host" class="workspace-type">
    <div class="flow-toolbar"><strong>Agent 工作流设计</strong><span /><button type="button" @click="autoLayout">自动布局</button><button type="button" @click="zoomOut()">－</button><button type="button" @click="zoomIn()">＋</button><button type="button" @click="fitView({ padding: 0.16 })">适应画布</button><button type="button" @click="toggleFullscreen">全屏</button></div>
    <div class="flow-canvas"><VueFlow v-model:nodes="nodes" v-model:edges="edges" :min-zoom="0.5" :max-zoom="1.8" fit-view-on-init /></div>
    <div class="io-grid"><label>用户输入<textarea v-model="input" rows="4" maxlength="500" /><small>{{ input.length }}/500 · 仅用于模拟</small></label><div><strong>Agent 输出</strong><p>{{ state === 'success' || state === 'submitted' ? definition.result : '等待运行 Agent…' }}</p></div></div>
    <div class="toolbox"><strong>工具白名单</strong><span v-for="tool in definition.tools" :key="tool.id">{{ tool.label }} · 模拟</span><button type="button" disabled>＋ 添加工具</button></div>
  </div>
</template>
