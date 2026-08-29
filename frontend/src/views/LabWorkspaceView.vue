<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import NotFoundState from '../components/NotFoundState.vue'
import LabWorkspaceShell from '../components/lab/LabWorkspaceShell.vue'
import { getLabDefinition } from '../labs/registry'
import { canTransition, progressForState } from '../labs/stateMachine'
import type { LabDefinition, LabRunState, LabType } from '../labs/types'
import { dataMode } from '../services/api/client'
import { contentApi } from '../services/api/content'
import { useLearningStore } from '../stores/learning'

const route = useRoute()
const store = useLearningStore()
const apiDefinition = ref<LabDefinition>()
const detailLoading = ref(false)
const detailError = ref('')
const definition = computed(() => dataMode === 'api' ? apiDefinition.value : getLabDefinition(String(route.params.labId)))
const state = ref<LabRunState>('ready')
const activeStep = ref(1)
const score = ref(0)
const logs = ref<string[]>([])
const result = ref('')
let timer: number | undefined
let logIndex = 0

const workspaceByType: Record<LabType, Component> = {
  agent: defineAsyncComponent(() => import('../components/lab/workspaces/AgentWorkspace.vue')),
  deployment: defineAsyncComponent(() => import('../components/lab/workspaces/DeploymentWorkspace.vue')),
  command: defineAsyncComponent(() => import('../components/lab/workspaces/CommandWorkspace.vue')),
  hardware: defineAsyncComponent(() => import('../components/lab/workspaces/HardwareWorkspace.vue')),
  project: defineAsyncComponent(() => import('../components/lab/workspaces/ProjectWorkspace.vue')),
}
const workspace = computed(() => definition.value ? workspaceByType[definition.value.type] : workspaceByType.agent)
const progress = computed(() => {
  if (!definition.value) return 0
  const stored = store.labProgress[definition.value.id] ?? definition.value.initialProgress
  return Math.max(stored, progressForState(state.value, definition.value.initialProgress))
})

const stopTimer = () => {
  window.clearInterval(timer)
  timer = undefined
}

const moveTo = (next: LabRunState) => {
  if (state.value === next || canTransition(state.value, next)) state.value = next
}

const reset = () => {
  stopTimer()
  state.value = 'ready'
  activeStep.value = 1
  score.value = 0
  result.value = ''
  logs.value = ['[ready] 实验已重置，等待运行模拟']
}

const run = () => {
  if (!definition.value || state.value === 'running') return
  if (!canTransition(state.value, 'running')) state.value = 'ready'
  moveTo('running')
  score.value = 0
  result.value = ''
  logs.value = []
  logIndex = 0
  stopTimer()
  timer = window.setInterval(() => {
    if (!definition.value) return
    logs.value = [...logs.value, definition.value.logs[logIndex]]
    activeStep.value = Math.min(definition.value.steps.length, logIndex + 1)
    logIndex += 1
    if (logIndex >= definition.value.logs.length) {
      stopTimer()
      moveTo('success')
      score.value = 86 + (definition.value.id.length % 8)
      result.value = definition.value.result
      store.setLabProgress(definition.value.id, 88)
    }
  }, 420)
}

const stop = () => {
  if (state.value !== 'running') return
  stopTimer()
  moveTo('stopped')
  result.value = '模拟运行已安全停止，可以继续调整后重新运行。'
  logs.value = [...logs.value, '[stopped] 用户停止了前端模拟']
}

const submit = async () => {
  if (!definition.value || state.value !== 'success') return
  if (!await store.submitLab(definition.value.id)) return
  moveTo('submitted')
  logs.value = [...logs.value, dataMode === 'api'
    ? '[submitted] 服务端已接收报告并更新成长记录'
    : '[submitted] 报告已在本地演示状态中标记提交']
  result.value = dataMode === 'api'
    ? `${definition.value.result} 报告已写入学习账号。`
    : `${definition.value.result} 报告仅保存在浏览器，不代表服务端已接收。`
}

const loadDefinition = async () => {
  reset()
  if (dataMode !== 'api') return
  detailLoading.value = true
  detailError.value = ''
  apiDefinition.value = undefined
  try {
    const item = await contentApi.lab(String(route.params.labId)) as {
      id: string
      title: string
      description: string
      summary: string
      labType: LabType
      category?: string
      level?: string
      minutes?: number
      coverVariant?: string
      stepsDetail: Array<{ id: string; title: string; description: string; sortOrder: number }>
    }
    apiDefinition.value = {
      id: item.id,
      type: item.labType,
      title: item.title,
      subtitle: item.description || item.summary,
      category: item.category || item.labType,
      level: item.level || '入门',
      duration: item.minutes || 60,
      coverVariant: item.coverVariant || item.labType,
      steps: item.stepsDetail.map((step, index) => ({ id: step.id, title: step.title, minutes: 10 + index * 3 })),
      tools: [{ id: `${item.labType}-simulator`, label: '受控模拟器', mode: 'simulated' }],
      initialProgress: 0,
      scoring: [{ label: '流程完成', points: 50 }, { label: '安全边界', points: 50 }],
      relatedResourceIds: [],
      task: item.description || item.summary,
      hints: ['按后台发布的步骤完成受控模拟。'],
      logs: item.stepsDetail.map((step) => `[step] ${step.title}`),
      result: '服务端已记录本次受控实训结果。',
    }
  } catch (error) {
    detailError.value = error instanceof Error ? error.message : '实训详情加载失败'
  } finally {
    detailLoading.value = false
  }
}

watch(() => route.params.labId, () => void loadDefinition(), { immediate: true })
onBeforeUnmount(stopTimer)
</script>

<template>
  <div v-if="detailLoading" class="page-container"><div class="notice">正在读取已发布实训配置…</div></div>
  <div v-else-if="detailError" class="page-container"><div class="notice error">{{ detailError }}，未回退到演示配置。</div></div>
  <NotFoundState
    v-else-if="!definition || !definition.steps.length"
    title="没有找到这个实训"
    description="未知实训或尚未发布步骤配置，不会回退到演示配置。"
    back-to="/labs"
    back-label="返回实训中心"
  />
  <LabWorkspaceShell
    v-else
    :definition="definition"
    :state="state"
    :progress="progress"
    :score="score"
    :active-step="activeStep"
    :logs="logs"
    :result="result"
    @update:active-step="activeStep = $event"
    @run="run"
    @stop="stop"
    @reset="reset"
    @submit="submit"
  >
    <component :is="workspace" :definition="definition" :state="state" />
  </LabWorkspaceShell>
</template>
