<script setup lang="ts">
import type { ResourceDetailDto } from '@ai-learning-hub/contracts'
import type { ResourceItem } from '../types'
import { dataMode, downloadFile } from '../services/api/client'
import { ref } from 'vue'
import AppDialog from './base/AppDialog.vue'
import CategoryCover from './base/CategoryCover.vue'
import { useRequireAuth } from '../composables/useRequireAuth'

const props = defineProps<{ modelValue: boolean; resource?: ResourceItem; detail?: ResourceDetailDto | null }>()
const requireAuth = useRequireAuth()
const error = ref(''), downloading = ref(false)
const download = () => {
  if (!props.detail?.file) return
  const file = props.detail.file
  const run = async () => { downloading.value = true; error.value = ''; try { const url = URL.createObjectURL(await downloadFile(file.id)); const link = document.createElement('a'); link.href = url; link.download = file.name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 30000) } catch (cause) { error.value = cause instanceof Error ? cause.message : '下载失败' } finally { downloading.value = false } }
  void requireAuth({ reason: '登录后可下载学习资源并记录使用进度', action: run })
}
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <AppDialog :model-value="modelValue" :title="resource?.title || '资源预览'" @update:model-value="$emit('update:modelValue', $event)">
    <CategoryCover v-if="resource" :title="resource.title" :media="resource" :variant="resource.coverVariant" :icon="resource.icon" eager />
    <p v-if="resource">{{ resource.format }} · {{ resource.category }} · {{ resource.difficulty }}</p>
    <div v-if="!resource" class="inline-empty small-empty"><p>没有找到这个资源 ID，请关闭后重新选择。</p></div>
    <div v-if="resource && dataMode === 'mock'" class="notice">演示资源：暂无真实文件，不会生成空文件或伪造成功。</div>
    <div v-else-if="resource && detail?.file" class="notice">{{ detail.file.name }} · {{ (detail.file.size / 1024).toFixed(1) }} KB · {{ detail.file.mimeType }}</div>
    <div v-else-if="resource" class="notice">当前已发布资源尚未绑定可下载文件。</div>
    <button v-if="detail?.file" class="button primary" :disabled="downloading" @click="download">{{ downloading ? '准备文件…' : '下载资源' }}</button><p v-if="error" class="community-error" role="alert">{{ error }}</p>
    <RouterLink v-if="resource" class="text-link" :to="`/community/search?bindingId=${resource.id}`">查看相关笔记</RouterLink>
  </AppDialog>
</template>
