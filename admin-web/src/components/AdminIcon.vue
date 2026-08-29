<script setup lang="ts">
defineProps<{ name?: string; size?: number }>()
</script>

<template>
  <svg class="admin-icon" :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <template v-if="['dashboard', 'chart', 'growth'].includes(name || '')">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </template>
    <template v-else-if="['home', 'homepage'].includes(name || '')">
      <path d="m3 11 9-8 9 8M5 10v11h14V10M9 21v-7h6v7" />
    </template>
    <template v-else-if="['course', 'theme', 'article', 'resource', 'report'].includes(name || '')">
      <path d="M6 3h8l4 4v14H6zM14 3v5h5M9 12h6M9 16h6" />
    </template>
    <template v-else-if="['lab', 'tool'].includes(name || '')">
      <path d="M9 3v5l-5 9a3 3 0 0 0 3 4h10a3 3 0 0 0 3-4l-5-9V3M7 14h10M8 3h8" />
    </template>
    <template v-else-if="['challenge', 'check'].includes(name || '')">
      <circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8" />
    </template>
    <template v-else-if="['users', 'growth-user'].includes(name || '')">
      <circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c3 0 5 2 5 5" />
    </template>
    <template v-else-if="name === 'settings'">
      <circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" />
    </template>
    <template v-else-if="['upload', 'publish'].includes(name || '')">
      <path d="M12 16V4M7 9l5-5 5 5M4 14v6h16v-6" />
    </template>
    <template v-else-if="name === 'download'">
      <path d="M12 4v12M7 11l5 5 5-5M4 20h16" />
    </template>
    <template v-else-if="name === 'clock'">
      <circle cx="12" cy="12" r="9" /><path d="M12 7v6l4 2" />
    </template>
    <template v-else-if="name === 'search'">
      <circle cx="10" cy="10" r="6" /><path d="m15 15 6 6" />
    </template>
    <template v-else-if="name === 'notification'">
      <path d="M6 17h12l-1.5-2V10a4.5 4.5 0 0 0-9 0v5zM10 20h4" />
    </template>
    <template v-else-if="name === 'plus'">
      <path d="M12 5v14M5 12h14" />
    </template>
    <template v-else-if="name === 'chevron-down'">
      <path d="m7 9 5 5 5-5" />
    </template>
    <template v-else-if="name === 'arrow-up'">
      <path d="m7 11 5-5 5 5M12 6v12" />
    </template>
    <template v-else-if="name === 'arrow-down'">
      <path d="m7 13 5 5 5-5M12 18V6" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </template>
    <template v-else>
      <path d="M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10" />
    </template>
  </svg>
</template>
