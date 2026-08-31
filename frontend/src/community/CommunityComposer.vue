<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { isNavigationFailure, NavigationFailureType, useRouter } from 'vue-router'
import AppDialog from '../components/base/AppDialog.vue'
import { useCommunityStore } from '../stores/community'
import { useCommunityDraft } from './composables/useCommunityDraft'
import CommunityAdvancedComposer from './CommunityAdvancedComposer.vue'
import CommunityQuickComposer from './CommunityQuickComposer.vue'
const store = useCommunityStore(), editor = useCommunityDraft(), router = useRouter()
const leave = (event: BeforeUnloadEvent) => { if (store.composerOpen && editor.dirty) { event.preventDefault(); event.returnValue = '' } }
let continuation: (() => void) | null = null
const removeGuard = router.beforeEach((to) => { if (!store.composerOpen || !editor.dirty) return; continuation = () => { void router.push(to.fullPath) }; editor.close(); return false })
const removeAfter = router.afterEach((to, _from, failure) => { if (store.composerOpen && to.path === '/community/drafts' && (!failure || isNavigationFailure(failure, NavigationFailureType.duplicated))) editor.close() })
const finish = async (save: boolean) => { if (save) await editor.saveAndClose(); else editor.discard(); if (!editor.closePrompt) { const next = continuation; continuation = null; next?.() } }
const cancel = () => { editor.closePrompt = false; continuation = null }
onMounted(() => window.addEventListener('beforeunload', leave))
onBeforeUnmount(() => { removeGuard(); removeAfter(); window.removeEventListener('beforeunload', leave) })
</script>
<template>
<section v-if="store.composerOpen && editor.conflict" class="community-publish-feedback" role="alert"><span>服务器已有较新版本，当前输入已保留。</span><button @click="editor.readServer">读取服务器版本</button><button @click="editor.keepCopy">保留当前副本</button></section>
<div v-if="store.publishNotice" class="community-publish-feedback" role="status" aria-live="polite"><span>{{ store.publishNotice.text }}</span><RouterLink :to="`/community/post/${store.publishNotice.id}`">查看动态</RouterLink><button type="button" aria-label="关闭发布提示" @click="store.publishNotice = null">×</button></div>
<AppDialog :model-value="store.composerOpen && !store.composerInline" :title="store.composerMode === 'advanced' ? '高级编辑' : '分享学习收获'" class="community-composer" @update:model-value="editor.close()"><template v-if="store.composerOpen && !store.composerInline"><CommunityAdvancedComposer v-if="store.composerMode === 'advanced'" /><CommunityQuickComposer v-else dialog /></template></AppDialog>
<AppDialog :model-value="editor.closePrompt" title="保留未完成的内容" @update:model-value="cancel"><p>还有正在编辑的内容，你希望怎样离开？</p><div class="composer-actions"><button class="button primary" :disabled="editor.saving" @click="finish(true)">{{ store.editingId && !editor.draftId ? '保留本地副本' : '保存服务器草稿' }}</button><button class="button secondary" @click="finish(false)">放弃修改</button><button class="button secondary" @click="cancel">继续编辑</button></div></AppDialog>
</template>
