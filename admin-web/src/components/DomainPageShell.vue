<script setup lang="ts" generic="T extends AdminCatalogItemDto<object>">
import type { AdminCatalogItemDto, CatalogContentType, CatalogCoverData, PageResult } from '@ai-learning-hub/contracts'
import { computed, reactive, ref, watch } from 'vue'
import AdminDataList from './AdminDataList.vue'
import AdminDialog from './AdminDialog.vue'
import AdminFilterBar from './AdminFilterBar.vue'
import AdminPageHeader from './AdminPageHeader.vue'
import AdminPagination from './AdminPagination.vue'
import AdminStatusTag from './AdminStatusTag.vue'
import AdminIcon from './AdminIcon.vue'
import MediaAssetPicker from './MediaAssetPicker.vue'

const props = defineProps<{
  title: string
  description: string
  noun: string
  icon: string
  contentType: CatalogContentType
  categoryKey?: string
  dataOrigin: string
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
  'update:dataOrigin': [value: string]
  select: [item: T]
  page: [page: number]
  retry: []
  create: [value: { slug: string; title: string; summary: string; coverAssetId: string | null }]
  save: [value: { title: string; summary: string; sortOrder: number; coverAssetId?: string | null }]
  publish: []
  archive: []
  remove: []
}>()
const dialog = defineModel<boolean>('dialog', { default: false })
const createForm = reactive({ slug: '', title: '', summary: '', coverAssetId: null as string | null })
const editForm = reactive({ title: '', summary: '', sortOrder: 0 })
const coverId = ref<string | null>(null), coverDirty = ref(false)
const currentCover = computed(() => props.selected?.data as Partial<CatalogCoverData> | undefined)
const createCategory = computed(() => ({ theme: createForm.slug, course: 'generic', lab: 'agent', resource: '学习手册', article: '大模型', challenge: 'weekly' })[props.contentType])
watch(() => props.selected, (item) => {
  editForm.title = item?.title || ''
  editForm.summary = item?.summary || ''
  editForm.sortOrder = item?.sortOrder || 0
  coverId.value = (item?.data as Partial<CatalogCoverData> | undefined)?.coverAssetId || null
  coverDirty.value = false
}, { immediate: true })
const create = () => {
  emit('create', { ...createForm })
  Object.assign(createForm, { slug: '', title: '', summary: '', coverAssetId: null })
}
</script>

<template>
  <AdminPageHeader :title="title" :description="description" :action="canWrite ? `新建${noun}` : undefined" @action="dialog = true" />
  <slot name="kpis" />
  <div v-if="error" class="error-banner">{{ error }}<button type="button" @click="emit('retry')">重试</button></div>
  <section class="catalog-workspace panel">
    <div class="catalog-main">
      <AdminFilterBar :keyword="keyword" :status="status" :placeholder="`搜索${noun}名称或标识`" @update:keyword="emit('update:keyword', $event)" @update:status="emit('update:status', $event)" @reset="emit('update:keyword', ''); emit('update:status', ''); emit('update:dataOrigin', '')">
        <select :value="dataOrigin" aria-label="内容来源" @change="emit('update:dataOrigin', ($event.target as HTMLSelectElement).value)"><option value="">全部来源</option><option value="demo_seed">预置演示内容</option><option value="admin_created">管理员创建</option><option value="imported">导入内容</option></select>
        <slot name="filters" />
      </AdminFilterBar>
      <slot name="list" :items="result.items">
        <AdminDataList :items="result.items" :selected="selected?.id" :icon="icon" :empty-text="`暂无${noun}`" @select="emit('select', $event)" />
      </slot>
      <AdminPagination :page="result.page" :page-size="result.pageSize" :total="result.total" @change="emit('page', $event)" />
    </div>
    <aside class="catalog-detail detail-panel">
      <template v-if="selected">
        <div class="detail-title"><div><span class="detail-icon"><AdminIcon :name="icon" /></span><strong>{{ selected.title }}</strong></div><AdminStatusTag :status="selected.status" /></div>
        <p class="settings-note">{{ selected.dataOrigin === 'demo_seed' ? '预置演示内容' : selected.dataOrigin === 'imported' ? '导入内容' : '管理员创建' }}</p>
        <slot name="detail" :item="selected" />
        <form @submit.prevent="emit('save', { ...editForm, ...(coverDirty ? { coverAssetId: coverId } : {}) })">
          <label>{{ noun }}标题<input v-model="editForm.title" maxlength="120" required :disabled="!canWrite" /></label>
          <label>内容摘要<textarea v-model="editForm.summary" maxlength="500" rows="3" required :disabled="!canWrite" /></label>
          <label>展示排序<input v-model.number="editForm.sortOrder" type="number" min="0" :disabled="!canWrite" /></label>
          <MediaAssetPicker :model-value="coverId" :content-type="contentType" :category-key="categoryKey" :disabled="!canWrite" :current="coverDirty ? undefined : currentCover" @update:model-value="coverId = $event; coverDirty = true" />
          <slot name="editor" :item="selected" />
          <div class="detail-actions">
            <button class="admin-secondary" type="submit" :disabled="loading || !canWrite">保存草稿</button>
            <button v-if="selected.status !== 'published'" class="admin-primary" type="button" :disabled="loading || !canPublish" @click="emit('publish')">发布{{ noun }}</button>
            <button v-else class="admin-danger" type="button" :disabled="loading || !canPublish" @click="emit('archive')">下架{{ noun }}</button>
            <button class="text-link" type="button" :disabled="loading || !canWrite" @click="emit('remove')">删除{{ noun }}</button>
          </div>
        </form>
      </template>
      <div v-else class="admin-empty"><AdminIcon :name="icon" /><strong>选择一条{{ noun }}</strong><small>右侧显示领域详情与编辑入口。</small></div>
    </aside>
  </section>
  <AdminDialog v-model="dialog" :title="`新建${noun}`">
    <form class="admin-form" @submit.prevent="create">
      <label>稳定标识<input v-model="createForm.slug" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></label>
      <label>{{ noun }}标题<input v-model="createForm.title" required maxlength="120" /></label>
      <label>摘要<textarea v-model="createForm.summary" required maxlength="500" rows="4" /></label>
      <MediaAssetPicker v-model="createForm.coverAssetId" :content-type="contentType" :category-key="createCategory" :disabled="!canWrite" />
      <slot name="create-fields" />
      <button class="admin-primary" type="submit" :disabled="loading || !canWrite">创建草稿</button>
    </form>
  </AdminDialog>
</template>
