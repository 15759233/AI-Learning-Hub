<script setup lang="ts">
import type { ResourceDetailDto } from '@ai-learning-hub/contracts'
import type { ResourceItem } from '../types'
import { dataMode } from '../services/api/client'
import AppDialog from './base/AppDialog.vue'
import CategoryCover from './base/CategoryCover.vue'

defineProps<{ modelValue: boolean; resource?: ResourceItem; detail?: ResourceDetailDto | null }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <AppDialog :model-value="modelValue" :title="resource?.title || '资源预览'" @update:model-value="$emit('update:modelValue', $event)">
    <CategoryCover v-if="resource" :title="resource.title" :variant="resource.coverVariant" :icon="resource.icon" />
    <p v-if="resource">{{ resource.format }} · {{ resource.category }} · {{ resource.difficulty }}</p>
    <div v-if="!resource" class="inline-empty small-empty"><p>没有找到这个资源 ID，请关闭后重新选择。</p></div>
    <div v-if="resource && dataMode === 'mock'" class="notice">演示资源：暂无真实文件，不会生成空文件或伪造成功。</div>
    <div v-else-if="resource && detail?.file" class="notice">{{ detail.file.name }} · {{ (detail.file.size / 1024).toFixed(1) }} KB · {{ detail.file.mimeType }}</div>
    <div v-else-if="resource" class="notice">当前已发布资源尚未绑定可下载文件。</div>
    <a v-if="resource?.downloadUrl" class="button primary" :href="resource.downloadUrl" download>下载资源</a>
  </AppDialog>
</template>
