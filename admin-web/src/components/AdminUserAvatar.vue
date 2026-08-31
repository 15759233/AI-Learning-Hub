<script setup lang="ts">
import { ref, watch } from 'vue'
const props = defineProps<{ name: string; src: string | null }>()
const failed = ref(false)
watch(() => props.src, () => { failed.value = false })
</script>
<template><span class="user-avatar"><img v-if="src && !failed" :src="src" :alt="name" @error="failed=true" /><span v-else aria-hidden="true">{{ name.slice(0, 1) }}</span></span></template>
<style scoped>.user-avatar{display:inline-flex;width:32px;height:32px;align-items:center;justify-content:center;overflow:hidden;border-radius:50%;background:#fff0e7;color:#bd4619;vertical-align:middle;margin-right:8px}.user-avatar img{width:100%;height:100%;object-fit:cover}</style>
