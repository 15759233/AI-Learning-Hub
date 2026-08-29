<script setup lang="ts">
interface AgentConfig { objective?: string; workflowTemplate?: string; availableTools?: string; maxIterations?: number; successCondition?: string }
const model = defineModel<AgentConfig>({ default: () => ({ objective: '', workflowTemplate: '', availableTools: '', maxIterations: 5, successCondition: '' }) })
</script>
<template><section class="domain-section"><h3>Agent 实训面板</h3><label>任务目标<textarea v-model="model.objective" rows="2" /></label><label>工作流模板<textarea v-model="model.workflowTemplate" rows="3" /></label><label>可用工具（逗号分隔）<input v-model="model.availableTools" /></label><label>最大迭代次数<input v-model.number="model.maxIterations" type="number" min="1" max="50" /></label><label>成功条件<input v-model="model.successCondition" /></label></section></template>
