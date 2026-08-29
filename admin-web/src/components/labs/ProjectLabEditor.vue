<script setup lang="ts">
interface ProjectConfig { deliverables?: string; rubric?: string; repositoryTemplate?: string; teamSize?: number; reviewMode?: string }
const model = defineModel<ProjectConfig>({ default: () => ({ deliverables: '', rubric: '', repositoryTemplate: '', teamSize: 1, reviewMode: 'automatic' }) })
</script>
<template><section class="domain-section"><h3>项目实训面板</h3><label>交付物（每行一项）<textarea v-model="model.deliverables" rows="3" /></label><label>评分量规<textarea v-model="model.rubric" rows="3" /></label><label>仓库模板<input v-model="model.repositoryTemplate" /></label><label>建议团队人数<input v-model.number="model.teamSize" type="number" min="1" max="20" /></label><label>评审方式<select v-model="model.reviewMode"><option value="automatic">自动校验</option><option value="manual">人工评审</option><option value="mixed">混合评审</option></select></label></section></template>
