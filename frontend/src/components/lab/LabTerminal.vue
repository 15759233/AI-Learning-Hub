<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { Terminal } from '@xterm/xterm'

const props = defineProps<{ lines: string[]; label?: string }>()
const host = ref<HTMLElement>()
let terminal: Terminal | undefined

const render = async () => {
  await nextTick()
  if (!terminal) return
  terminal.clear()
  props.lines.forEach((line) => terminal?.writeln(`\x1b[32m${line}\x1b[0m`))
}

onMounted(() => {
  if (!host.value) return
  terminal = new Terminal({
    rows: 8,
    fontSize: 13,
    theme: { background: '#07111d', foreground: '#b8f7cc' },
    disableStdin: true,
  })
  terminal.open(host.value)
  render()
})
watch(() => props.lines, render, { deep: true })
onBeforeUnmount(() => terminal?.dispose())
</script>

<template>
  <div ref="host" class="terminal-host" :aria-label="label || '受控模拟终端输出'" />
</template>
