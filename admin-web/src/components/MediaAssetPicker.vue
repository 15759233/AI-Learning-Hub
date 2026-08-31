<script setup lang="ts">
import type { CatalogCoverData, MediaAssetDto, MediaContentType, ResolvedMedia } from '@ai-learning-hub/contracts'
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { usePermissionAction } from '../composables/usePermissionAction'
import { api } from '../services/api'
import { categoryKeyFor } from '../services/media'
import AdminDialog from './AdminDialog.vue'
import MediaAssetLibrary from './MediaAssetLibrary.vue'
import MediaAssetPreview from './MediaAssetPreview.vue'

const props = withDefaults(defineProps<{ modelValue?: string | null; contentType: MediaContentType; categoryKey?: string; kind?: 'cover' | 'hero'; disabled?: boolean; current?: Partial<CatalogCoverData> }>(), { modelValue: null, kind: 'cover', categoryKey: 'generic' })
const emit = defineEmits<{ 'update:modelValue': [value: string | null] }>()
const model = computed({ get: () => props.modelValue, set: (value: string | null) => emit('update:modelValue', value) })
const canRead = usePermissionAction('media.read')
const dialog = ref(false), error = ref(''), loading = ref(false), removed = ref(false)
const fallback = ref<ResolvedMedia | null>(null), asset = ref<MediaAssetDto | null>(null)
const category = computed(() => categoryKeyFor(props.contentType, props.categoryKey))
const labels = { category_default: '分类默认图', type_default: '类型通用图', global_default: '平台通用图', explicit: '显式封面', legacy: '兼容旧封面' }
const legacy = computed(() => !removed.value && !model.value && props.current?.coverSource === 'legacy' ? props.current.cover : undefined)
const invalidExplicit = computed(() => !!model.value && !!asset.value && asset.value.status !== 'active')
let epoch = 0
watch([model, category, canRead, dialog], async () => {
  if (dialog.value) return
  const request = ++epoch
  asset.value = null; fallback.value = null; error.value = ''
  if (!canRead.value) return
  loading.value = true
  try {
    const query = new URLSearchParams({ contentType: props.contentType, categoryKey: category.value })
    const [defaultImage, selectedAsset] = await Promise.all([
      api<ResolvedMedia | null>(`/admin/media-assets/resolve?${query}`),
      model.value ? api<MediaAssetDto>(`/admin/media-assets/${encodeURIComponent(model.value)}`).catch(() => null) : Promise.resolve(null),
    ])
    if (request !== epoch) return
    fallback.value = defaultImage; asset.value = selectedAsset
    if (model.value && !selectedAsset) error.value = '显式素材不存在或不可读取，公开页面将使用默认封面。'
  } catch (cause) { if (request === epoch) error.value = cause instanceof Error ? cause.message : '默认封面读取失败' }
  finally { if (request === epoch) loading.value = false }
}, { immediate: true })
watch(() => props.current, () => { removed.value = false })
const select = (value: MediaAssetDto) => { removed.value = false; model.value = value.id; dialog.value = false }
const remove = () => { removed.value = true; emit('update:modelValue', null) }
onBeforeUnmount(() => { epoch++ })
</script>

<template>
  <section class="media-picker">
    <h4>{{ kind === 'hero' ? '页面主视觉' : '内容封面' }}</h4>
    <p v-if="!canRead" class="settings-note">没有素材读取权限，现有封面保持不变。</p>
    <template v-else>
      <p v-if="loading" class="settings-note" role="status">正在解析封面…</p>
      <p v-if="error || invalidExplicit || current?.coverWarning" class="media-warning" role="alert">{{ error || (invalidExplicit ? '当前显式素材已归档，公开页面使用默认封面。' : current?.coverWarning) }}</p>
      <div class="media-picker-previews">
        <div>
          <MediaAssetPreview v-if="model && asset && !invalidExplicit" :asset-id="model" :alt="asset.altText || asset.name" :focal-x="asset.focalX" :focal-y="asset.focalY" :revision="asset.revision" />
          <MediaAssetPreview v-else-if="legacy" :public-url="legacy" :alt="current?.coverAlt || '当前封面'" />
          <MediaAssetPreview v-else :asset-id="fallback?.id" :public-url="fallback?.url" :alt="fallback?.alt || '默认封面'" :focal-x="fallback?.focalPoint.x" :focal-y="fallback?.focalPoint.y" />
          <small>{{ model && asset && !invalidExplicit ? asset.name : legacy ? '兼容旧封面（未修改时保留）' : labels[fallback?.source || 'global_default'] }}</small>
        </div>
        <div v-if="model || legacy">
          <MediaAssetPreview :asset-id="fallback?.id" :public-url="fallback?.url" :alt="fallback?.alt || '回退封面'" :focal-x="fallback?.focalPoint.x" :focal-y="fallback?.focalPoint.y" />
          <small>移除后：{{ labels[fallback?.source || 'global_default'] }}</small>
        </div>
      </div>
      <div class="media-picker-actions">
        <button class="admin-secondary" type="button" :disabled="disabled" @click="dialog = true">{{ model || legacy ? '替换图片' : '选择图片' }}</button>
        <button v-if="model || legacy" class="text-link" type="button" :disabled="disabled" @click="remove">移除显式封面</button>
      </div>
      <p class="settings-note">保存{{ kind === 'hero' ? '设置' : '草稿' }}后生效{{ kind === 'hero' ? '' : '，学生端仅使用已发布版本' }}。移除只解除绑定，不删除素材。</p>
    </template>
    <AdminDialog v-model="dialog" :title="kind === 'hero' ? '选择页面主视觉' : '选择内容封面'" width="min(1080px, 94vw)">
      <MediaAssetLibrary v-if="dialog" selectable :kind="kind" :content-type="contentType" :category-key="category" @select="select" />
    </AdminDialog>
  </section>
</template>

<style scoped>
.media-picker { min-width: 0; padding: 16px 0; border-block: 1px solid #eee8e1; margin: 16px 0; }
.media-picker h4 { margin: 0 0 12px; font-size: 13px; }
.media-picker-previews { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.media-picker-previews > div { min-width: 0; }
.media-picker-previews small { display: block; margin-top: 7px; color: #817970; font-size: 11px; overflow-wrap: anywhere; }
.media-picker-actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 12px; }
.media-warning { color: #985611; font-size: 12px; line-height: 1.6; }
</style>
