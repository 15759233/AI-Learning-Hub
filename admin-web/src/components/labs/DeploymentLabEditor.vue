<script setup lang="ts">
interface DeploymentConfig { runtime?: string; image?: string; port?: number; healthPath?: string; environmentKeys?: string }
const model = defineModel<DeploymentConfig>({ default: () => ({ runtime: 'docker', image: '', port: 8080, healthPath: '/health', environmentKeys: '' }) })
</script>
<template><section class="domain-section"><h3>部署实训面板</h3><label>运行时<select v-model="model.runtime"><option>docker</option><option>kubernetes</option><option>serverless</option></select></label><label>镜像或制品<input v-model="model.image" /></label><label>服务端口<input v-model.number="model.port" type="number" min="1" max="65535" /></label><label>健康检查路径<input v-model="model.healthPath" /></label><label>允许的环境变量键<input v-model="model.environmentKeys" /></label></section></template>
