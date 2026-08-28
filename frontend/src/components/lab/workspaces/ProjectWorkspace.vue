<script setup lang="ts">
import { ref } from 'vue'
import type { LabDefinition, LabRunState } from '../../../labs/types'

defineProps<{ definition: LabDefinition; state: LabRunState }>()
const requirement = ref('')
const selectedModule = ref('输入与校验')
const modules = ['输入与校验', '核心处理', '结果展示', '安全说明']
</script>

<template>
  <div class="workspace-type project-workspace">
    <div class="workspace-heading"><div><strong>{{ definition.title }} · 项目画布</strong><small>不同项目使用独立配置、输入输出与成果要求</small></div><span class="status" :class="state">{{ state }}</span></div>
    <div class="project-stage-grid"><button v-for="(step, index) in definition.steps" :key="step.id" type="button"><span>0{{ index + 1 }}</span><strong>{{ step.title }}</strong></button></div>
    <div class="io-grid"><label>需求说明<textarea v-model="requirement" rows="5" :placeholder="definition.task" /></label><div><strong>当前模块</strong><select v-model="selectedModule"><option v-for="item in modules" :key="item">{{ item }}</option></select><p>{{ state === 'success' || state === 'submitted' ? definition.result : '选择模块并补充需求，运行后生成成果说明。' }}</p></div></div>
    <div class="project-output"><strong>成果要求</strong><span>可解释的输入输出</span><span>明确的演示边界</span><span>可复查的运行记录</span><span>后端接口占位说明</span></div>
  </div>
</template>
