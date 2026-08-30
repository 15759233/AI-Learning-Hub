<script setup lang="ts">
import { computed } from 'vue'
import { LANDING_ICON_KEYS, LANDING_IMAGE_KEYS, type LandingCapabilityItem, type LandingModuleKey } from '@ai-learning-hub/contracts'
const props = defineProps<{ moduleKey: LandingModuleKey; config: Record<string, unknown> }>()
const emit = defineEmits<{ 'update:config': [config: Record<string, unknown>] }>()
const labels: Record<string, string> = { brandName: '英文品牌名', brandSubtitle: '中文品牌副标题', eyebrow: '小标签', titleFirst: '主标题第一行', titleSecond: '主标题第二行', description: '说明', primaryLabel: '主按钮文字', secondaryLabel: '次按钮文字', title: '标题', topicsTitle: '话题区标题', creatorsTitle: '创作者区标题', buttonLabel: '按钮文字' }
const textFields = computed(() => Object.keys(props.config).filter((key) => Object.hasOwn(labels, key)))
const capabilities = computed(() => (Array.isArray(props.config.items) ? props.config.items : []) as LandingCapabilityItem[])
const set = (field: string, event: Event) => emit('update:config', { ...props.config, [field]: (event.target as HTMLInputElement).value })
const imageLabels: Record<string, string> = { heroArms: '透明机械臂', robotCar: '智能小车', robotVision: '视觉识别实验', aiWorkspace: 'AI 工作流', ctaRobot: '行动区机器人' }
</script>
<template><div class="module-editor-fields">
  <label v-for="key in textFields" :key="key">{{ labels[key] }}<textarea v-if="key === 'description'" :value="String(config[key])" rows="3" maxlength="240" @input="set(key, $event)" /><input v-else :value="String(config[key])" maxlength="100" @input="set(key, $event)" /></label>
  <label v-if="'image' in config">正式图片<select :value="config.image" @change="set('image', $event)"><option v-for="key in LANDING_IMAGE_KEYS" :key="key" :value="key">{{ imageLabels[key] }}</option></select><small>使用已打包的正式资源，不接受外链或图片代码。</small></label>
  <label v-if="moduleKey === 'landing_hero'">成员数量展示<select :value="config.memberDisplay" @change="set('memberDisplay', $event)"><option value="count">真实学习者数量与头像</option><option value="avatars">仅头像</option><option value="hidden">不展示</option></select></label>
  <fieldset v-for="(item, index) in capabilities" :key="index" class="landing-capability-editor"><legend>能力 {{ index + 1 }}</legend><label>标题<input v-model="item.title" maxlength="30" /></label><label>描述<textarea v-model="item.description" rows="2" maxlength="80" /></label><label>SVG 图标<select v-model="item.icon"><option v-for="key in LANDING_ICON_KEYS" :key="key" :value="key">{{ key }}</option></select></label><div><button class="text-link" type="button" :disabled="index === 0" @click="[capabilities[index - 1], capabilities[index]] = [capabilities[index], capabilities[index - 1]]">上移</button><button class="text-link" type="button" :disabled="index === capabilities.length - 1" @click="[capabilities[index + 1], capabilities[index]] = [capabilities[index], capabilities[index + 1]]">下移</button></div></fieldset>
</div></template>
<style scoped>.landing-capability-editor { border: 1px solid #eee5df; padding: 12px; border-radius: 10px; margin-block: 12px; }.landing-capability-editor legend { font-size: 12px; }</style>
