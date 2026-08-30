import { describe, expect, it } from 'vitest'
import { createSSRApp } from 'vue'
import { renderToString, type SSRContext } from 'vue/server-renderer'
import AppDialog from './AppDialog.vue'

describe('共享弹窗属性透传', () => {
  it('扩展属性落在原生 dialog，未扩展的旧弹窗保持原始类名和可访问标题', async () => {
    for (const attributes of [{ class: 'community-composer', 'data-test': 'composer' }, {}]) {
      const app = createSSRApp(AppDialog, { modelValue: false, title: '学习弹窗', ...attributes })
      const warnings: string[] = [], context: SSRContext = {}
      app.config.warnHandler = (message) => warnings.push(message)
      await renderToString(app, context)
      const html = context.teleports!.body!
      const dialog = html.match(/<dialog\b[^>]*>/)![0]
      expect(dialog).toContain('app-dialog')
      expect(dialog).toContain('aria-labelledby="dialog-')
      expect(html).toContain('关闭学习弹窗')
      if (attributes.class) {
        expect(dialog).toContain('community-composer')
        expect(dialog).toContain('data-test="composer"')
      } else {
        expect(dialog).toContain('class="app-dialog"')
        expect(dialog).not.toContain('community-composer')
      }
      expect(warnings).toEqual([])
    }
  })
})
