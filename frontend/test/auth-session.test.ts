import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { createSSRApp, h, type Slots } from 'vue'
import { renderToString } from '@vue/server-renderer'
import { useAuthStore } from '../src/stores/auth'
import { useAuthUiStore } from '../src/stores/authUi'
import { authApi } from '../src/services/api/auth'
import AuthDialog from '../src/components/AuthDialog.vue'
const mode = vi.hoisted(() => ({ value: 'mock' }))
vi.mock('../src/services/api/client', () => ({ get dataMode() { return mode.value }, restoreRefresh: vi.fn().mockResolvedValue(true), ApiError: class extends Error { constructor(message: string, public status: number) { super(message) } } }))
vi.mock('../src/services/api/auth', () => ({ authApi: { me: vi.fn(), login: vi.fn(), logout: vi.fn(), registrationConfig: vi.fn() } }))
vi.mock('../src/stores/community', () => ({ useCommunityStore: () => ({ clear: vi.fn() }) }))
vi.mock('../src/stores/learning', () => ({ useLearningStore: () => ({ clearAccountState: vi.fn(), syncFromApi: vi.fn().mockResolvedValue(undefined) }) }))
vi.mock('vue-router', () => ({ useRouter: () => ({ push: vi.fn() }) }))
vi.mock('../src/components/base/AppDialog.vue', () => ({ default: { setup: (_props: unknown, { slots }: { slots: Slots }) => () => h('section', slots.default?.()) } }))
const values = new Map<string, string>()
beforeEach(() => {
  vi.resetAllMocks(); values.clear(); mode.value = 'mock'; setActivePinia(createPinia())
  const storage = { getItem: (key: string) => values.get(key) || null, setItem: (key: string, value: string) => values.set(key, value), removeItem: (key: string) => values.delete(key) }
  vi.stubGlobal('sessionStorage', storage); vi.stubGlobal('localStorage', storage)
})
describe('统一登录恢复', () => {
  it('Mock force恢复可再次执行且单次并发复用Promise', async () => {
    const auth = useAuthStore()
    const first = auth.restore(), pending = auth.restorePromise, second = auth.restore()
    expect(auth.restorePromise).toBe(pending); await Promise.all([first, second])
    expect(auth.restorePromise).toBeNull(); expect(auth.user).toBeNull()
    values.set('community-demo-login', 'true')
    await auth.restore(true)
    expect(auth.user?.id).toBe('student'); expect(auth.restorePromise).toBeNull()
  })
  it('API的5xx保留会话并展示重试，401才清空', async () => {
    mode.value = 'api'
    const { ApiError } = await import('../src/services/api/client'), auth = useAuthStore()
    values.set('student-access-token', 'test-token')
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError('数据库暂不可用', 500))
    await auth.restore()
    expect(auth.authState).toBe('error'); expect(values.has('student-access-token')).toBe(true)
    vi.mocked(authApi.me).mockRejectedValueOnce(new ApiError('会话过期', 401))
    await auth.restore(true)
    expect(auth.authState).toBe('anonymous'); expect(values.has('student-access-token')).toBe(false)
  })
  it('退出会话清除注册后待续接操作，不能串到后账号', () => {
    const ui = useAuthUiStore(); ui.afterOnboardingAction = vi.fn()
    values.set('student-after-onboarding', '/profile')
    useAuthStore().clearSession()
    expect(ui.afterOnboardingAction).toBeNull(); expect(values.has('student-after-onboarding')).toBe(false)
  })
  it('注册最低长度提高到12后，登录表单仍允许原8位密码', async () => {
    const pinia = createPinia(), auth = useAuthStore(pinia), ui = useAuthUiStore(pinia)
    auth.registrationConfig = { mode: 'open', emailVerification: false, schoolRequired: false, agreementVersion: 'v1', passwordMinLength: 12, mailAvailable: false, inviteAvailable: false }
    ui.mode = 'login'
    const login = await renderToString(createSSRApp(AuthDialog).use(pinia))
    expect(login).toMatch(/type="password"[^>]*minlength="8"/)
    ui.mode = 'register'
    const registration = await renderToString(createSSRApp(AuthDialog).use(pinia))
    expect(registration).toMatch(/type="password"[^>]*minlength="12"/)
  })
})
