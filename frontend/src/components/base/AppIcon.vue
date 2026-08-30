<script setup lang="ts">
defineProps<{ name?: string; size?: number }>()
</script>

<template>
  <svg class="app-icon" :width="size || 20" :height="size || 20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <template v-if="name === 'question'"><circle cx="12" cy="12" r="9" /><path d="M9 9a3 3 0 0 1 6 0c0 2-3 2-3 4M12 17h.01" /></template>
    <template v-else-if="name === 'note-edit'"><path d="M12 4H5v16h15v-7M9 15l1-4 8-8 3 3-8 8zM15 6l3 3" /></template>
    <template v-else-if="name === 'lab-share'"><path d="M6 4h12v17l-6-4-6 4zM9 8h6" /></template>
    <template v-else-if="name === 'more-circle'"><circle cx="12" cy="12" r="9" /><path d="M7 12h.01M12 12h.01M17 12h.01" /></template>
    <template v-else-if="name === 'target'"><circle cx="11" cy="13" r="8" /><circle cx="11" cy="13" r="3" /><path d="m11 13 9-10M16 3h4v4" /></template>
    <template v-else-if="name === 'course'"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 3v18M13 3v8l2-2 2 2V3" /></template>
    <template v-else-if="name === 'arrow-up-right'"><path d="M6 18 18 6M7 6h11v11" /></template>
    <template v-else-if="name === 'message'"><path d="M4 4h16v12H9l-5 4zM8 8h8M8 12h5" /></template>
    <template v-else-if="name === 'heart'"><path d="M12 20 4 12a5 5 0 0 1 8-6 5 5 0 0 1 8 6z" /></template>
    <template v-else-if="name === 'bell'"><path d="M5 17h14l-2-3V9a5 5 0 0 0-10 0v5zM10 21h4" /></template>
    <template v-else-if="name === 'plus'"><path d="M12 4v16M4 12h16" /></template>
    <template v-else-if="name === 'refresh'"><path d="M20 8a8 8 0 1 0 0 8M20 3v5h-5" /></template>
    <template v-else-if="name === 'book'"><path d="M12 5c-3-2-6-2-9-1v15c3-1 6-1 9 1 3-2 6-2 9-1V4c-3-1-6-1-9 1v15" /></template>
    <template v-else-if="name === 'folder' || name === 'project-folder'"><path d="M3 6h7l2 3h9v11H3zM3 6V4h6l2 2h10v3" /></template>
    <template v-else-if="name === 'sparkles'"><path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" /></template>
    <template v-else-if="['bot', 'agent', 'tool', 'workflow', 'memory'].includes(name || '')">
      <rect x="5" y="7" width="14" height="11" rx="3" /><path d="M12 3v4M8.5 12h.01M15.5 12h.01M9 16h6" />
    </template>
    <template v-else-if="['server', 'deployment', 'container', 'api', 'pulse'].includes(name || '')">
      <rect x="4" y="4" width="16" height="6" rx="2" /><rect x="4" y="14" width="16" height="6" rx="2" /><path d="M8 7h.01M8 17h.01M12 7h5M12 17h5" />
    </template>
    <template v-else-if="['terminal', 'command', 'git', 'code'].includes(name || '')">
      <rect x="3" y="4" width="18" height="16" rx="3" /><path d="m7 9 3 3-3 3M12.5 15H17" />
    </template>
    <template v-else-if="['chip', 'hardware', 'gpu', 'sensor', 'edge', 'energy'].includes(name || '')">
      <rect x="7" y="7" width="10" height="10" rx="2" /><path d="M9 2v3M15 2v3M9 19v3M15 19v3M2 9h3M2 15h3M19 9h3M19 15h3M10 10h4v4h-4z" />
    </template>
    <template v-else-if="['shield', 'security', 'lock', 'scale'].includes(name || '')">
      <path d="M12 3 20 6v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3Z" /><path d="m9 12 2 2 4-5" />
    </template>
    <template v-else-if="['image', 'crop'].includes(name || '')">
      <rect x="3" y="4" width="18" height="16" rx="3" /><circle cx="9" cy="9" r="2" /><path d="m5 18 5-5 3 3 2-2 4 4" />
    </template>
    <template v-else-if="['search', 'database', 'rag'].includes(name || '')">
      <circle cx="10" cy="10" r="6" /><path d="m15 15 6 6M7 8h6M7 11h4" />
    </template>
    <template v-else-if="['file', 'note', 'template', 'card'].includes(name || '')">
      <path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 12h6M9 16h6" />
    </template>
    <template v-else-if="name === 'check'">
      <circle cx="12" cy="12" r="9" /><path d="m8 12 2.5 2.5L16.5 8" />
    </template>
    <template v-else-if="['bookmark', 'favorite'].includes(name || '')">
      <path d="M6 4h12v17l-6-4-6 4z" />
    </template>
    <template v-else-if="['trophy', 'achievement'].includes(name || '')">
      <path d="M8 4h8v5a4 4 0 0 1-8 0zM10 13v3M14 13v3M8 20h8M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4" />
    </template>
    <template v-else-if="['play', 'run'].includes(name || '')">
      <circle cx="12" cy="12" r="9" /><path d="m10 8 6 4-6 4z" />
    </template>
    <template v-else-if="name === 'arrow-right'">
      <path d="M5 12h14M14 7l5 5-5 5" />
    </template>
    <template v-else-if="name === 'arrow-left'">
      <path d="M19 12H5M10 7l-5 5 5 5" />
    </template>
    <template v-else-if="name === 'menu'">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </template>
    <template v-else-if="name === 'close'">
      <path d="m6 6 12 12M18 6 6 18" />
    </template>
    <template v-else-if="['chart', 'growth'].includes(name || '')">
      <path d="M4 20V10M10 20V4M16 20v-7M22 20H2" />
    </template>
    <template v-else-if="['users', 'graduation'].includes(name || '')">
      <circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2" /><path d="M3 20c0-4 2-6 6-6s6 2 6 6M15 15c3 0 5 2 5 5" />
    </template>
    <template v-else>
      <path d="M12 3 4 7v10l8 4 8-4V7zM4 7l8 4 8-4M12 11v10" />
    </template>
  </svg>
</template>
