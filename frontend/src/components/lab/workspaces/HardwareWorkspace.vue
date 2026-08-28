<script setup lang="ts">
import { computed, ref } from 'vue'
import type { LabDefinition, LabRunState } from '../../../labs/types'

defineProps<{ definition: LabDefinition; state: LabRunState }>()
const temperature = ref(28)
const threshold = ref(30)
const connected = ref(false)
const collecting = ref(false)
const warning = computed(() => collecting.value && temperature.value >= threshold.value)
</script>

<template>
  <div class="workspace-type hardware-workspace">
    <div class="workspace-heading"><div><strong>虚拟硬件实验台</strong><small>不访问 WebUSB、蓝牙或串口</small></div><span :class="['hardware-light', { on: connected }]" aria-label="虚拟连接状态" /></div>
    <div class="hardware-board"><div class="board-chip">AI<br />EDGE</div><span>温度传感器</span><span>虚拟 GPIO 17</span><span>浏览器数据流</span></div>
    <div class="sensor-grid"><label>模拟温度 <input v-model="temperature" type="range" min="15" max="45" /><strong>{{ temperature }}°C</strong></label><label>告警阈值 <input v-model="threshold" type="number" min="20" max="40" />°C</label><button class="button lab-secondary" type="button" @click="connected = !connected">{{ connected ? '断开虚拟连接' : '建立虚拟连接' }}</button><button class="button primary" type="button" :disabled="!connected" @click="collecting = !collecting">{{ collecting ? '停止采集' : '开始模拟采集' }}</button></div>
    <div :class="['sensor-result', { warning }]"><strong>{{ warning ? '阈值告警' : collecting ? '数据正常' : '等待采集' }}</strong><p>{{ warning ? `模拟温度 ${temperature}°C 已达到 ${threshold}°C 阈值。` : '所有数据仅存在于当前浏览器状态。' }}</p></div>
  </div>
</template>
