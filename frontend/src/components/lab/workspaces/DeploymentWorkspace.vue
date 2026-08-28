<script setup lang="ts">
import { ref } from 'vue'
import type { LabDefinition, LabRunState } from '../../../labs/types'

defineProps<{ definition: LabDefinition; state: LabRunState }>()
const model = ref('MiniLM 文本分类')
const port = ref(8000)
const testInput = ref('这门 AI 课程很有帮助')
</script>

<template>
  <div class="workspace-type deployment-workspace">
    <div class="workspace-heading"><div><strong>模型部署模拟器</strong><small>不下载模型，不启动服务，不开放端口</small></div><span class="status" :class="state">{{ state }}</span></div>
    <div class="deployment-grid">
      <label>模型<select v-model="model"><option>MiniLM 文本分类</option><option>TinyBERT 情感分析</option></select></label>
      <label>模拟端口<input v-model="port" type="number" min="1024" max="65535" /></label>
      <div><strong>环境参数</strong><p>Python 3.11 · CPU · 512 MB（模拟）</p></div>
      <div><strong>启动命令预览</strong><code>uvicorn demo:app --port {{ port }}</code></div>
    </div>
    <div class="service-status"><span><strong>服务状态</strong>{{ state === 'success' || state === 'submitted' ? 'Running（模拟）' : 'Stopped' }}</span><span><strong>模拟接口地址</strong>http://demo.local:{{ port }}/predict</span><span><strong>健康检查</strong>{{ state === 'success' || state === 'submitted' ? '200 / healthy（模拟）' : '等待运行' }}</span></div>
    <div class="io-grid"><label>测试输入<textarea v-model="testInput" rows="4" /></label><div><strong>测试输出</strong><p>{{ state === 'success' || state === 'submitted' ? '演示分类：积极，置信度 0.92。未调用真实 API。' : '启动模拟后显示测试结果。' }}</p></div></div>
  </div>
</template>
