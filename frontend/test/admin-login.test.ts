import { expect, it, vi } from 'vitest'
import LoginView from '../../admin-web/src/views/LoginView.vue'
import { setupComponent } from '../src/community/test-renderer'

const handlers = vi.hoisted(() => ({ login: vi.fn(), replace: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: () => ({ query: {} }), useRouter: () => ({ replace: handlers.replace }) }))
vi.mock('../../admin-web/src/stores/session', () => ({ useSessionStore: () => ({ login: handlers.login, error: '该账号没有管理后台权限', loading: false }) }))
it('后台登录拒绝由已有错误提示承接，不泄漏事件Promise或继续导航', async () => {
  handlers.login.mockRejectedValueOnce(new Error('该账号没有管理后台权限'))
  const view = setupComponent<{ submit: () => Promise<void> }>(LoginView)
  await expect(view.state.submit()).resolves.toBeUndefined()
  expect(handlers.replace).not.toHaveBeenCalled()
  view.unmount()
})
