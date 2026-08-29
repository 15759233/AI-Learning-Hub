<script setup lang="ts">
interface CommandConfig { shell?: string; workingDirectory?: string; allowedCommands?: string; expectedOutput?: string; timeoutSeconds?: number }
const model = defineModel<CommandConfig>({ default: () => ({ shell: 'bash', workingDirectory: '/workspace', allowedCommands: '', expectedOutput: '', timeoutSeconds: 30 }) })
</script>
<template><section class="domain-section"><h3>命令实训面板</h3><label>命令解释器<select v-model="model.shell"><option>bash</option><option>python</option><option>node</option></select></label><label>受控工作目录<input v-model="model.workingDirectory" /></label><label>白名单命令（每行一条）<textarea v-model="model.allowedCommands" rows="4" /></label><label>期望输出<input v-model="model.expectedOutput" /></label><label>超时秒数<input v-model.number="model.timeoutSeconds" type="number" min="1" max="300" /></label></section></template>
