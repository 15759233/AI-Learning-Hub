<script setup lang="ts">
import { Chart } from '@antv/g2'
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const props = defineProps<{ data: Array<{ date: string; activeUsers: number; learningMinutes: number }> }>()
const host = ref<HTMLDivElement | null>(null)
let chart: Chart | null = null
const render = async () => {
  if (!host.value) return
  chart?.destroy()
  chart = new Chart({ container: host.value, autoFit: true, height: 210 })
  chart.options({
    type: 'line',
    data: props.data.flatMap((item) => [
      { date: item.date.slice(5), metric: '活跃用户', value: item.activeUsers },
      { date: item.date.slice(5), metric: '学习分钟', value: item.learningMinutes },
    ]),
    encode: { x: 'date', y: 'value', color: 'metric' },
    scale: { color: { range: ['#ff4d1f', '#7c4dff'] } },
    style: { lineWidth: 3 },
    axis: { y: { grid: true, label: false }, x: { title: false } },
  })
  await chart.render()
}
onMounted(render)
watch(() => props.data, () => { void nextTick(render) }, { deep: true })
onBeforeUnmount(() => chart?.destroy())
</script>

<template><div ref="host" class="trend-chart" /></template>
