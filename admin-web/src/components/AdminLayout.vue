<script setup lang="ts">
import AdminHeader from './AdminHeader.vue'
import AdminSidebar from './AdminSidebar.vue'
</script>

<template>
  <div class="admin-shell">
    <AdminSidebar />
    <div class="admin-main">
      <AdminHeader />
      <main class="admin-content"><RouterView /></main>
    </div>
  </div>
</template>
