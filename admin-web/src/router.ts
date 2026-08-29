import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'
import AdminLayout from './components/AdminLayout.vue'
import { useSessionStore } from './stores/session'

const management = (path: string, kind: string, title: string, description: string, icon: string): RouteRecordRaw => ({
  path,
  component: () => import('./views/ManagementView.vue'),
  meta: { kind, title, description, icon },
})

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/login', component: () => import('./views/LoginView.vue'), meta: { public: true, title: '登录' } },
    {
      path: '/',
      component: AdminLayout,
      children: [
        { path: '', redirect: '/dashboard' },
        { path: 'dashboard', component: () => import('./views/DashboardView.vue'), meta: { title: '数据看板' } },
        { path: 'homepage', component: () => import('./views/HomepageView.vue'), meta: { title: '首页运营' } },
        management('themes', 'themes', '学习主题管理', '管理平台学习主题与学习路径，优化学习内容体系', '▤'),
        management('courses', 'courses', '课程内容管理', '编辑课程详情、章节大纲与结构化学习内容', '▣'),
        management('labs', 'labs', '实训项目管理', '配置受控实训步骤、工具环境与发布状态', '⬡'),
        management('resources', 'resources', '资源中心管理', '管理学习资源、文件信息与发布状态', '▱'),
        management('articles', 'articles', 'AI 前沿管理', '维护前沿资讯、分类、推荐位与发布计划', '◉'),
        management('challenges', 'challenges', '挑战测评管理', '配置挑战、题库关联、目标分数与排行', '▦'),
        { path: 'growth', component: () => import('./views/GrowthView.vue'), meta: { title: '用户成长管理' } },
        { path: 'settings', component: () => import('./views/SettingsView.vue'), meta: { title: '系统设置' } },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/dashboard' },
  ],
})

router.beforeEach((to) => {
  document.title = `${String(to.meta.title || '管理后台')}｜AI MAKER CAMPUS`
  const session = useSessionStore()
  if (!to.meta.public && !session.user) return { path: '/login', query: { redirect: to.fullPath } }
  if (to.path === '/login' && session.user) return '/dashboard'
})

export default router
