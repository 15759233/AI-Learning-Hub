<script setup lang="ts">
import type { CatalogItemDto } from '@ai-learning-hub/contracts'
import { reactive, watch } from 'vue'
import AdminStatusTag from './AdminStatusTag.vue'

const props = defineProps<{ item: CatalogItemDto | null; busy?: boolean; noun: string }>()
const emit = defineEmits<{ save: [value: { title: string; summary: string; sortOrder: number }]; publish: []; archive: [] }>()
const form = reactive({ title: '', summary: '', sortOrder: 0 })
watch(() => props.item, (item) => {
  form.title = item?.title || ''
  form.summary = item?.summary || ''
  form.sortOrder = item?.sortOrder || 0
}, { immediate: true })
</script>

<template>
  <aside class="detail-panel">
    <template v-if="item">
      <div class="detail-title"><div><span class="detail-icon">◇</span><strong>{{ item.title }}</strong></div><AdminStatusTag :status="item.status" /></div>
      <form @submit.prevent="emit('save', form)">
        <label>{{ noun }}标题<input v-model="form.title" maxlength="120" required /></label>
        <label>内容摘要<textarea v-model="form.summary" maxlength="500" rows="4" required /></label>
        <label>展示排序<input v-model.number="form.sortOrder" type="number" min="0" /></label>
        <div class="detail-meta"><span><small>稳定标识</small>{{ item.slug }}</span><span><small>更新时间</small>{{ new Date(item.updatedAt).toLocaleString('zh-CN') }}</span></div>
        <section><h3>前台展示映射</h3><p>该记录由统一 API 和 PostgreSQL 提供；发布后学生端 API 模式读取同一记录。</p></section>
        <div class="detail-actions">
          <button class="admin-secondary" type="submit" :disabled="busy">保存草稿</button>
          <button v-if="item.status !== 'published'" class="admin-primary" type="button" :disabled="busy" @click="emit('publish')">发布{{ noun }}</button>
          <button v-else class="admin-danger" type="button" :disabled="busy" @click="emit('archive')">下架{{ noun }}</button>
        </div>
      </form>
    </template>
    <div v-else class="admin-empty"><span>◇</span><strong>选择一条内容</strong><small>右侧将显示详情、编辑与发布操作。</small></div>
  </aside>
</template>
