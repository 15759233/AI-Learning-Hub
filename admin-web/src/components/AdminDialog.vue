<script setup lang="ts">
defineProps<{ modelValue: boolean; title: string }>()
defineEmits<{ 'update:modelValue': [value: boolean] }>()
</script>

<template>
  <el-dialog :model-value="modelValue" :title="title" width="520px" align-center destroy-on-close @update:model-value="$emit('update:modelValue', $event)">
    <slot />
  </el-dialog>
</template>
