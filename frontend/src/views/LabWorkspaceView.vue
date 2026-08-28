<script setup lang="ts">
import { computed, defineAsyncComponent, onBeforeUnmount, ref, watch, type Component } from 'vue'
import { useRoute } from 'vue-router'
import NotFoundState from '../components/NotFoundState.vue'
import LabWorkspaceShell from '../components/lab/LabWorkspaceShell.vue'
import { getLabDefinition } from '../labs/registry'
import { canTransition, progressForState } from '../labs/stateMachine'
import type { LabRunState, LabType } from '../labs/types'
import { useLearningStore } from '../stores/learning'

const route = useRoute()
const store = useLearningStore()
const definition = computed(() => getLabDefinition(String(route.params.labId)))
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

const submit = () => {
  if (!definition.value || state.value !== 'success') return
  moveTo('submitted')
  store.submitLab(definition.value.id)
  logs.value = [...logs.value, '[submitted] 报告已在本地演示状态中标记提交']
  result.value = `${definition.value.result} 报告仅保存在浏览器，不代表服务端已接收。`
}

watch(() => route.params.labId, reset, { immediate: true })
onBeforeUnmount(stopTimer)
</script>

<template>
  <NotFoundState
    v-if="!definition"
    title="没有找到这个实训"
    description="未知 labId 不会回退到其他实验，请返回实训中心重新选择。"
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
