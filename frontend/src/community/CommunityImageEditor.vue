<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import Cropper, { type CropperImage, type CropperSelection } from 'cropperjs'
import AppDialog from '../components/base/AppDialog.vue'
import { communityApi } from '../services/api/community'
import { useCommunityDraft, type PendingCommunityImage } from './composables/useCommunityDraft'
import { boundedSize, exportImage, prepareImage } from './imageEditing'

const props = defineProps<{ item: PendingCommunityImage }>()
const editor = useCommunityDraft(), container = ref<HTMLDivElement>()
const loading = ref(true), exporting = ref(false), error = ref(''), alt = ref(props.item.alt)
const ratio = ref('original'), grayscale = ref(false), brightness = ref(100), zoom = ref(1), resizeScale = ref(1)
const cropSize = ref({ width: 0, height: 0 }), cropAspect = ref(1)
const output = computed(() => { const width = Math.floor(cropSize.value.width * resizeScale.value); return { width, height: Math.floor(width / cropAspect.value) } })
const busy = computed(() => loading.value || exporting.value || editor.imageUploading)
const ratios = [['original', '原图'], ['free', '自由裁切'], ['1', '1:1'], ['1.3333333333333333', '4:3'], ['1.7777777777777777', '16:9']]
let cropper: Cropper | undefined, cropImage: CropperImage | undefined, selection: CropperSelection | undefined
let url = '', disposed = false, changing = false, naturalWidth = 0, naturalHeight = 0, fitScale = 1, rotation = 0, flipped = false, mime = 'image/png'
let prepared: File | undefined
let areaWidth = 0, areaHeight = 0
const controller = new AbortController()
const invalidate = () => { prepared = undefined; error.value = '' }
const bounds = (matrix = cropImage!.$getTransform()) => {
  const [a, b, c, d, e, f] = matrix as [number, number, number, number, number, number]
  const width = Math.abs(a) * naturalWidth + Math.abs(c) * naturalHeight, height = Math.abs(b) * naturalWidth + Math.abs(d) * naturalHeight
  return { x: naturalWidth / 2 + e - width / 2, y: naturalHeight / 2 + f - height / 2, width, height }
}
const contains = (outer: { x: number; y: number; width: number; height: number }, inner: { x: number; y: number; width: number; height: number }) => inner.x >= outer.x - .5 && inner.y >= outer.y - .5 && inner.x + inner.width <= outer.x + outer.width + .5 && inner.y + inner.height <= outer.y + outer.height + .5
const updateSize = () => {
  if (!selection || !cropImage) return
  const [a = 1, b = 0] = cropImage.$getTransform(), scale = Math.hypot(a, b)
  cropAspect.value = selection.width / selection.height
  cropSize.value = boundedSize(Math.max(1, Math.floor(selection.width / scale + .000001)), Math.max(1, Math.floor(selection.height / scale + .000001)))
  zoom.value = scale / fitScale; resizeScale.value = 1; invalidate()
}
const selectRatio = (value: string) => {
  if (!selection || !cropImage) return
  ratio.value = value
  const image = bounds(), area = cropper!.getCropperCanvas()!
  const box = { x: Math.max(0, image.x), y: Math.max(0, image.y), width: Math.min(area.clientWidth, image.x + image.width) - Math.max(0, image.x), height: Math.min(area.clientHeight, image.y + image.height) - Math.max(0, image.y) }
  const aspect = value === 'original' ? (rotation % 180 ? naturalHeight / naturalWidth : naturalWidth / naturalHeight) : value === 'free' ? NaN : Number(value)
  selection.aspectRatio = aspect
  let width = box.width, height = box.height
  if (Number.isFinite(aspect)) { width = Math.min(width, height * aspect); height = width / aspect }
  changing = true
  selection.$change(box.x + (box.width - width) / 2, box.y + (box.height - height) / 2, width, height)
  changing = false; updateSize()
}
const fit = () => {
  if (!cropImage || !container.value) return
  const area = cropper!.getCropperCanvas()!, angle = rotation * Math.PI / 180, sign = flipped ? -1 : 1
  areaWidth = area.clientWidth; areaHeight = area.clientHeight
  const rotatedWidth = rotation % 180 ? naturalHeight : naturalWidth, rotatedHeight = rotation % 180 ? naturalWidth : naturalHeight
  fitScale = Math.min(area.clientWidth / rotatedWidth, area.clientHeight / rotatedHeight) * .92
  changing = true
  cropImage.$setTransform(Math.cos(angle) * fitScale * sign, Math.sin(angle) * fitScale * sign, -Math.sin(angle) * fitScale, Math.cos(angle) * fitScale, (area.clientWidth - naturalWidth) / 2, (area.clientHeight - naturalHeight) / 2)
  changing = false; selectRatio(ratio.value)
}
const resizeArea = () => {
  if (!cropImage || !selection || disposed) return
  const area = cropper!.getCropperCanvas()!, width = area.clientWidth, height = area.clientHeight
  if (!areaWidth || !areaHeight || !width || !height || (width === areaWidth && height === areaHeight)) return
  const scale = Math.min(width / areaWidth, height / areaHeight), [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = cropImage.$getTransform()
  const sizeScale = resizeScale.value, cached = prepared
  changing = true
  cropImage.$setTransform(a * scale, b * scale, c * scale, d * scale, (naturalWidth / 2 + e - areaWidth / 2) * scale + width / 2 - naturalWidth / 2, (naturalHeight / 2 + f - areaHeight / 2) * scale + height / 2 - naturalHeight / 2)
  selection.$change((selection.x - areaWidth / 2) * scale + width / 2, (selection.y - areaHeight / 2) * scale + height / 2, selection.width * scale, selection.height * scale)
  fitScale *= scale; areaWidth = width; areaHeight = height
  changing = false; updateSize(); resizeScale.value = sizeScale; prepared = cached
}
const reset = () => { rotation = 0; flipped = false; ratio.value = 'original'; grayscale.value = false; brightness.value = 100; alt.value = props.item.alt; fit(); applyStyle() }
const rotate = () => { rotation = (rotation + 90) % 360; fit() }
const flip = () => {
  if (!cropImage) return
  // 在画布坐标中水平翻转，旋转后仍保持“水平”的含义。
  changing = true
  const [a = 1, b = 0, c = 0, d = 1, e = 0, f = 0] = cropImage.$getTransform()
  cropImage.$setTransform(-a, b, -c, d, e, f)
  changing = false; flipped = !flipped; updateSize()
}
const changeZoom = (event: Event) => {
  if (!cropImage) return
  const target = Number((event.target as HTMLInputElement).value), [a = 1, b = 0] = cropImage.$getTransform()
  const factor = target * fitScale / Math.hypot(a, b)
  cropImage.$zoom(factor >= 1 ? factor - 1 : 1 - 1 / factor)
  updateSize()
}
const applyStyle = () => { if (cropImage) cropImage.style.filter = `grayscale(${grayscale.value ? 1 : 0}) brightness(${brightness.value / 100})`; invalidate() }
const changeSize = (event: Event, side: 'width' | 'height') => {
  const value = Number((event.target as HTMLInputElement).value), max = cropSize.value[side]
  if (!Number.isInteger(value) || value <= 0 || value > max || Math.min(cropSize.value.width, cropSize.value.height) * value / max < 1) { error.value = '请输入正整数，且不能放大超过当前裁切尺寸'; return }
  resizeScale.value = value / max; invalidate()
}
const save = async () => {
  if (busy.value || !selection) return
  error.value = ''; exporting.value = true
  try {
    if (!prepared) {
      const canvas = await selection.$toCanvas({ width: output.value.width })
      try { prepared = await exportImage(canvas, mime, grayscale.value, brightness.value) } finally { canvas.width = canvas.height = 0 }
    }
    if (!disposed) await editor.saveEditedImage(props.item.id, prepared, alt.value)
  } catch (cause) { if (!disposed) error.value = cause instanceof Error ? cause.message : '保存失败，可重试或取消；原图片仍保留' }
  finally { exporting.value = false }
}
const selectionChange = (event: Event) => {
  if (changing) return
  const next = (event as CustomEvent<{ x: number; y: number; width: number; height: number }>).detail
  const area = cropper!.getCropperCanvas()!
  if (!contains(bounds(), next) || !contains({ x: 0, y: 0, width: area.clientWidth, height: area.clientHeight }, next) || next.width < 8 || next.height < 8) { event.preventDefault(); return }
  queueMicrotask(() => { if (!disposed) updateSize() })
}
const imageTransform = (event: Event) => {
  if (changing || !selection) return
  const matrix = (event as CustomEvent<{ matrix: number[] }>).detail.matrix, scale = Math.hypot(matrix[0]!, matrix[1]!) / fitScale
  if (scale < .999 || scale > 4.001 || !contains(bounds(matrix), selection)) { event.preventDefault(); return }
  queueMicrotask(() => { if (!disposed) updateSize() })
}
let observer: ResizeObserver | undefined
onMounted(async () => {
  try {
    const blob = props.item.file || await communityApi.imageBlob(props.item.fileId!, controller.signal)
    if (disposed) return
    mime = blob.type
    const extension = mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png'
    const file = blob instanceof File ? blob : new File([blob], `community-image.${extension}`, { type: mime })
    const normalized = await prepareImage(file)
    if (disposed) return
    url = URL.createObjectURL(normalized)
    const image = new Image(); image.src = url; await image.decode()
    if (disposed) return
    naturalWidth = image.naturalWidth; naturalHeight = image.naturalHeight
    await nextTick()
    if (disposed || !container.value) return
    cropper = new Cropper(image, { container: container.value, template: '<cropper-canvas background><cropper-image scalable translatable initial-fit="contain"></cropper-image><cropper-shade></cropper-shade><cropper-handle action="move" plain></cropper-handle><cropper-selection movable resizable precise outlined><cropper-grid role="grid" covered></cropper-grid><cropper-handle action="move" plain></cropper-handle><cropper-handle action="n-resize"></cropper-handle><cropper-handle action="e-resize"></cropper-handle><cropper-handle action="s-resize"></cropper-handle><cropper-handle action="w-resize"></cropper-handle><cropper-handle action="ne-resize"></cropper-handle><cropper-handle action="nw-resize"></cropper-handle><cropper-handle action="se-resize"></cropper-handle><cropper-handle action="sw-resize"></cropper-handle></cropper-selection></cropper-canvas>' })
    cropImage = cropper.getCropperImage()!; selection = cropper.getCropperSelection()!
    // 缓存命中时 $ready 可能早于 load；等库完成 load 中的自动居中后再设置裁切。
    await new Promise<void>((resolve, reject) => {
      cropImage!.$image.addEventListener('load', () => resolve(), { once: true, signal: controller.signal })
      cropImage!.$image.addEventListener('error', () => reject(new Error('图片无法读取，请重新选择')), { once: true, signal: controller.signal })
      controller.signal.addEventListener('abort', () => reject(controller.signal.reason), { once: true })
    })
    if (disposed) return
    fit(); cropImage.addEventListener('transform', imageTransform); selection.addEventListener('change', selectionChange)
    observer = new ResizeObserver(resizeArea); observer.observe(container.value)
  } catch (cause) { if (!disposed) error.value = cause instanceof Error ? cause.message : '图片无法读取，请重新选择' }
  finally { loading.value = false }
})
onBeforeUnmount(() => { disposed = true; controller.abort(); observer?.disconnect(); cropImage?.removeEventListener('transform', imageTransform); selection?.removeEventListener('change', selectionChange); cropper?.destroy(); if (url) URL.revokeObjectURL(url); prepared = undefined })
</script>
<template>
  <AppDialog model-value title="编辑图片" class="community-image-editor" :close-on-backdrop="false" @update:model-value="editor.cancelImage(item.id)">
    <template #header="{ titleId, close }"><header class="image-editor-header"><button class="text-link" type="button" @click="close">取消</button><strong :id="titleId">编辑图片</strong><button class="button primary small" type="button" :disabled="busy || !cropSize.width" @click="save">{{ editor.imageUploading ? '上传中…' : exporting ? '处理中…' : '保存' }}</button></header></template>
    <div class="image-editor-meta"><span>第{{ item.position }}张 / 共{{ item.total }}张</span><span>{{ output.width }} × {{ output.height }} 像素</span></div>
    <div ref="container" class="image-editor-canvas" aria-label="拖动图片或裁切框调整构图"><span v-if="loading" role="status">正在读取图片…</span></div>
    <p v-if="error" class="community-error image-editor-error" role="alert">{{ error }}</p>
    <fieldset class="image-editor-controls" :disabled="busy || !cropSize.width">
      <div class="image-editor-ratios" aria-label="裁切比例"><button v-for="[value, label] in ratios" :key="value" type="button" class="button secondary small" :aria-pressed="ratio === value" @click="selectRatio(value!)">{{ label }}</button></div>
      <div class="image-editor-row"><button class="text-link" type="button" @click="rotate">旋转 90°</button><button class="text-link" type="button" @click="flip">水平翻转</button><button class="text-link" type="button" @click="reset">重置</button><label class="image-editor-zoom">缩放<input :value="zoom" type="range" min="1" max="4" step="0.01" aria-label="缩放图片" @input="changeZoom" /></label></div>
      <div class="image-editor-row"><button class="button secondary small" type="button" :aria-pressed="!grayscale" @click="grayscale = false; applyStyle()">原图</button><button class="button secondary small" type="button" :aria-pressed="grayscale" @click="grayscale = true; applyStyle()">黑白</button><label class="image-editor-zoom">亮度<input v-model.number="brightness" type="range" min="70" max="130" step="1" aria-label="图片亮度" @input="applyStyle" /><output>{{ brightness }}%</output></label></div>
      <details><summary>尺寸 · 等比例缩小</summary><div class="image-editor-row"><label>宽<input :value="output.width" type="number" min="1" :max="cropSize.width" aria-label="导出宽度" @change="changeSize($event, 'width')" /></label><span>×</span><label>高<input :value="output.height" type="number" min="1" :max="cropSize.height" aria-label="导出高度" @change="changeSize($event, 'height')" /></label><small>最长边不超过 4096 像素</small></div></details>
      <details><summary>图片说明</summary><label class="image-editor-description">描述图片内容，方便其他人理解<textarea v-model="alt" maxlength="200" rows="2" aria-label="图片说明" /><small>{{ alt.length }} / 200</small></label></details>
    </fieldset>
  </AppDialog>
</template>
