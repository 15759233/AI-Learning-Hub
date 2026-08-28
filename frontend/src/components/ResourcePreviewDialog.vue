<script setup lang="ts">
import type { ResourceItem } from '../types'
import AppDialog from './base/AppDialog.vue'
import CategoryCover from './base/CategoryCover.vue'

defineProps<{ modelValue: boolean; resource?: ResourceItem }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <AppDialog :model-value="modelValue" :title="resource?.title || '资源预览'" @update:model-value="$emit('update:modelValue', $event)">
    <CategoryCover v-if="resource" :title="resource.title" :variant="resource.coverVariant" :icon="resource.icon" />
    <p v-if="resource">{{ resource.format }} · {{ resource.category }} · {{ resource.difficulty }}</p>
    <div v-if="!resource" class="inline-empty small-empty"><p>没有找到这个资源 ID，请关闭后重新选择。</p></div>
    <div v-if="resource" class="notice">演示资源：暂无真实文件，下载接口待接入，不会生成空文件或伪造成功。</div>
    <a v-if="resource?.downloadUrl" class="button primary" :href="resource.downloadUrl" download>下载资源</a>
    <button v-else-if="resource" class="button secondary" type="button" disabled>下载接口待接入</button>
  </AppDialog>
</template>
