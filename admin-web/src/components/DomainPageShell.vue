<script setup lang="ts" generic="T extends AdminCatalogItemDto<object>">
import type { AdminCatalogItemDto, PageResult } from '@ai-learning-hub/contracts'
import { reactive, watch } from 'vue'
import AdminDataList from './AdminDataList.vue'
import AdminDialog from './AdminDialog.vue'
import AdminFilterBar from './AdminFilterBar.vue'
import AdminPageHeader from './AdminPageHeader.vue'
import AdminPagination from './AdminPagination.vue'
import AdminStatusTag from './AdminStatusTag.vue'

const props = defineProps<{
  title: string
  description: string
  noun: string
  icon: string
  result: PageResult<T>
  selected: T | null
  keyword: string
  status: string
  loading?: boolean
  error?: string
  canWrite: boolean
  canPublish: boolean
}>()
const emit = defineEmits<{
  'update:keyword': [value: string]
  'update:status': [value: string]
  select: [item: T]
  page: [page: number]
  retry: []
  create: [value: { slug: string; title: string; summary: string }]
  save: [value: { title: string; summary: string; sortOrder: number }]
  publish: []
  archive: []
}>()
const dialog = defineModel<boolean>('dialog', { default: false })
const createForm = reactive({ slug: '', title: '', summary: '' })
const editForm = reactive({ title: '', summary: '', sortOrder: 0 })
watch(() => props.selected, (item) => {
  editForm.title = item?.title || ''
  editForm.summary = item?.summary || ''
  editForm.sortOrder = item?.sortOrder || 0
}, { immediate: true })
const create = () => {
  emit('create', { ...createForm })
  Object.assign(createForm, { slug: '', title: '', summary: '' })
}
</script>

<template>
  <AdminPageHeader :title="title" :description="description" :action="canWrite ? `新建${noun}` : undefined" @action="dialog = true" />
  <slot name="kpis" />
  <div v-if="error" class="error-banner">{{ error }}<button type="button" @click="emit('retry')">重试</button></div>
  <section class="catalog-workspace panel">
    <div class="catalog-main">
      <AdminFilterBar :keyword="keyword" :status="status" :placeholder="`搜索${noun}名称或标识`" @update:keyword="emit('update:keyword', $event)" @update:status="emit('update:status', $event)" @reset="emit('update:keyword', ''); emit('update:status', '')">
        <slot name="filters" />
      </AdminFilterBar>
      <slot name="list" :items="result.items">
        <AdminDataList :items="result.items" :selected="selected?.id" :icon="icon" :empty-text="`暂无${noun}`" @select="emit('select', $event)" />
      </slot>
      <AdminPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="emit('page', $event)" />
    </div>
    <aside class="catalog-detail detail-panel">
      <template v-if="selected">
        <div class="detail-title"><div><span class="detail-icon">{{ icon }}</span><strong>{{ selected.title }}</strong></div><AdminStatusTag :status="selected.status" /></div>
        <slot name="detail" :item="selected" />
        <form @submit.prevent="emit('save', { ...editForm })">
          <label>{{ noun }}标题<input v-model="editForm.title" maxlength="120" required :disabled="!canWrite" /></label>
          <label>内容摘要<textarea v-model="editForm.summary" maxlength="500" rows="3" required :disabled="!canWrite" /></label>
          <label>展示排序<input v-model.number="editForm.sortOrder" type="number" min="0" :disabled="!canWrite" /></label>
          <slot name="editor" :item="selected" />
          <div class="detail-actions">
            <button class="admin-secondary" type="submit" :disabled="loading || !canWrite">保存草稿</button>
            <button v-if="selected.status !== 'published'" class="admin-primary" type="button" :disabled="loading || !canPublish" @click="emit('publish')">发布{{ noun }}</button>
            <button v-else class="admin-danger" type="button" :disabled="loading || !canPublish" @click="emit('archive')">下架{{ noun }}</button>
          </div>
        </form>
      </template>
      <div v-else class="admin-empty"><span>{{ icon }}</span><strong>选择一条{{ noun }}</strong><small>右侧显示领域详情与编辑入口。</small></div>
    </aside>
  </section>
  <AdminDialog v-model="dialog" :title="`新建${noun}`">
    <form class="admin-form" @submit.prevent="create">
      <label>稳定标识<input v-model="createForm.slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      <label>{{ noun }}标题<input v-model="createForm.title" required maxlength="120" /></label>
      <label>摘要<textarea v-model="createForm.summary" required maxlength="500" rows="4" /></label>
      <slot name="create-fields" />
      <button class="admin-primary" type="submit" :disabled="loading || !canWrite">创建草稿</button>
    </form>
  </AdminDialog>
</template>
