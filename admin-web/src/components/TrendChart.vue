<script setup lang="ts">
import { Chart } from '@antv/g2'
import { onBeforeUnmount, onMounted, ref } from 'vue'

const host = ref<HTMLDivElement | null>(null)
let chart: Chart | null = null
onMounted(() => {
  if (!host.value) return
  chart = new Chart({ container: host.value, autoFit: true, height: 210 })
  chart.options({
    type: 'line',
    data: [
      { day: '周一', value: 1120 }, { day: '周二', value: 980 }, { day: '周三', value: 1380 },
      { day: '周四', value: 1460 }, { day: '周五', value: 1290 }, { day: '周六', value: 1340 }, { day: '周日', value: 1580 },
    ],
    encode: { x: 'day', y: 'value' },
    style: { stroke: '#ff4d1f', lineWidth: 3 },
    axis: { y: { grid: true, label: false }, x: { title: false } },
  })
  void chart.render()
})
onBeforeUnmount(() => chart?.destroy())
</script>

<template><div ref="host" class="trend-chart" /></template>
