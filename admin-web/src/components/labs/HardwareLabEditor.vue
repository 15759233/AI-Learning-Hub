<script setup lang="ts">
interface HardwareConfig { board?: string; simulator?: string; pins?: string; sensorSchema?: string; expectedSignal?: string }
const model = defineModel<HardwareConfig>({ default: () => ({ board: '', simulator: '', pins: '', sensorSchema: '', expectedSignal: '' }) })
</script>
<template><section class="domain-section"><h3>硬件实训面板</h3><label>开发板型号<input v-model="model.board" /></label><label>模拟器<select v-model="model.simulator"><option value="">未配置</option><option>Wokwi</option><option>Web Serial Mock</option></select></label><label>允许引脚<input v-model="model.pins" /></label><label>传感器数据结构<textarea v-model="model.sensorSchema" rows="3" /></label><label>期望信号<input v-model="model.expectedSignal" /></label></section></template>
