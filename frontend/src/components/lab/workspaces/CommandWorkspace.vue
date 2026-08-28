<script setup lang="ts">
import { ref } from 'vue'
import { runSimulatedCommand } from '../../../labs/validators'
import type { LabDefinition, LabRunState } from '../../../labs/types'
import LabTerminal from '../LabTerminal.vue'

defineProps<{ definition: LabDefinition; state: LabRunState }>()
const command = ref('')
const lines = ref(['[safe] 这是内存模拟文件系统，不连接真实 Shell', '$ pwd', '/home/student/ai-lab'])
const feedback = ref('先观察目录，再尝试白名单命令。')
const allowed = ['pwd', 'ls', 'cd', 'mkdir', 'touch', 'cat', 'cp', 'mv', 'grep', 'ps', 'echo']

const execute = () => {
  const result = runSimulatedCommand(command.value)
  if (result.command) lines.value = [...lines.value, `$ ${result.command}`, result.output]
  feedback.value = result.ok ? '命令格式正确，可以继续下一项任务。' : result.output
  command.value = ''
}
</script>

<template>
  <div class="workspace-type command-workspace">
    <div class="workspace-heading"><div><strong>Linux 命令训练</strong><small>参数化白名单解析，不使用字符串包含判断</small></div><span class="status" :class="state">{{ state }}</span></div>
    <LabTerminal :lines="lines" label="Linux 命令模拟终端" />
    <form class="command-input" @submit.prevent="execute"><label for="lab-command">$</label><input id="lab-command" v-model="command" autocomplete="off" placeholder="输入白名单命令，例如 ls" /><button class="button primary" type="submit">执行模拟命令</button></form>
    <p class="learning-feedback" role="status">{{ feedback }}</p>
    <div class="toolbox"><strong>允许命令</strong><span v-for="item in allowed" :key="item">{{ item }}</span></div>
  </div>
</template>
