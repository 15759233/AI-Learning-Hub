<script setup lang="ts">
import { nextTick, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useCommunityStore } from '../stores/community'
import { useAuthStore } from '../stores/auth'
import CommunityAdvancedComposer from './CommunityAdvancedComposer.vue'
import type { CommunityPostType } from '@ai-learning-hub/contracts'
const store = useCommunityStore(), auth = useAuthStore(), panel = ref<HTMLElement>()
const types: Array<[CommunityPostType, string]> = [['general', '学习交流'], ['question', '提出问题'], ['note', '发布笔记'], ['lab_result', '分享实训'], ['project', '展示项目'], ['frontier_discussion', '前沿讨论']]
const open = (type: CommunityPostType = 'general') => store.openComposer({ type })
watch(() => store.composerOpen && store.composerInline, async (open) => { if (open) { await nextTick(); panel.value?.scrollIntoView({ block: 'nearest' }); panel.value?.querySelector('textarea')?.focus({ preventScroll: true }) } })
const focus = () => { if (store.composerInline) { panel.value?.scrollIntoView({ block: 'nearest' }); panel.value?.querySelector('textarea')?.focus({ preventScroll: true }) } }
onMounted(() => window.addEventListener('community-composer-focus', focus))
onBeforeUnmount(() => window.removeEventListener('community-composer-focus', focus))
</script>
<template><section id="community-quick-composer" ref="panel" class="community-quick-composer"><template v-if="!store.composerOpen || !store.composerInline"><button class="quick-prompt" @click="open()"><span class="avatar">{{ auth.user?.displayName.slice(0, 1) }}</span><span>分享你今天学到的 AI 知识……</span></button><div class="quick-types"><button v-for="[type, label] in types" :key="type" @click="open(type)">{{ label }}</button></div></template><CommunityAdvancedComposer v-else /></section></template>
