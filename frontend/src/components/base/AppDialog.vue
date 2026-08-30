<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = withDefaults(defineProps<{
  modelValue: boolean
  title: string
  closeOnBackdrop?: boolean
}>(), { closeOnBackdrop: true })

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()
const dialog = ref<HTMLDialogElement>()
const titleId = `dialog-${useId()}`
let previousFocus: HTMLElement | null = null
let previousOverflow = ''

const close = () => emit('update:modelValue', false)

const syncDialog = async (open: boolean) => {
  await nextTick()
  if (!dialog.value) return
  if (open && !dialog.value.open) {
    previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
    previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialog.value.showModal()
    dialog.value.querySelector<HTMLElement>('[autofocus], input, select, textarea, button, a')?.focus()
  } else if (!open && dialog.value.open) {
    dialog.value.close()
    document.body.style.overflow = previousOverflow
    previousFocus?.focus()
  }
}

const onCancel = (event: Event) => {
  event.preventDefault()
  close()
}

const onBackdrop = (event: MouseEvent) => {
  if (props.closeOnBackdrop && event.target === dialog.value) close()
}

const onKeydown = (event: KeyboardEvent) => {
  if (props.modelValue && event.key === 'Escape') {
    event.preventDefault()
    close()
  }
}

watch(() => props.modelValue, syncDialog, { immediate: true })
onMounted(() => window.addEventListener('keydown', onKeydown))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.body.style.overflow = previousOverflow
})
</script>

<template>
  <Teleport to="body">
    <dialog v-bind="$attrs" ref="dialog" class="app-dialog" :aria-labelledby="titleId" @cancel="onCancel" @click="onBackdrop">
      <div class="dialog-card" @click.stop>
        <div class="dialog-title">
          <strong :id="titleId">{{ title }}</strong>
          <button class="icon-button" type="button" :aria-label="`关闭${title}`" @click="close">×</button>
        </div>
        <slot :close="close" />
      </div>
    </dialog>
  </Teleport>
</template>
