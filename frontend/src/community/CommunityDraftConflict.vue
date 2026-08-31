<script setup lang="ts">
import { useCommunityDraft } from './composables/useCommunityDraft'
const editor = useCommunityDraft()
</script>
<template>
  <section v-if="editor.conflict || editor.draftUnavailable" class="community-notice" role="alert">
    <p>{{ editor.draftUnavailable ? '原草稿已发布、删除或不可访问，当前输入已保留。可另存为新副本，不会覆盖原内容。' : '服务器已有较新版本，当前输入已保留。' }}</p>
    <div class="composer-actions"><button v-if="!editor.draftUnavailable" class="button secondary small" type="button" :disabled="editor.saving" @click="editor.readServer">读取服务器版本</button><button class="button secondary small" type="button" :disabled="editor.saving" @click="editor.keepCopy">保留当前副本</button></div>
  </section>
</template>
