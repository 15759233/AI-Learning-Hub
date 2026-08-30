import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  resolve: { alias: [{ find: /^@ai-learning-hub\/contracts$/, replacement: '@ai-learning-hub/contracts/src/index.ts' }] },
  server: { host: '127.0.0.1' },
  preview: { host: '127.0.0.1' },
})
