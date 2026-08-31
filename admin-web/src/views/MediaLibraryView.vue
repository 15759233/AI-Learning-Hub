<script setup lang="ts">
import AdminPageHeader from '../components/AdminPageHeader.vue'
import MediaAssetLibrary from '../components/MediaAssetLibrary.vue'
</script>
<template>
  <AdminPageHeader title="素材库" description="管理封面、页面主视觉与默认图片；素材与业务内容独立维护" />
  <section class="panel"><MediaAssetLibrary /></section>
</template>
