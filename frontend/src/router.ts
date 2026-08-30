import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from './stores/auth'
import { useCommunityStore } from './stores/community'

declare module 'vue-router' {
  interface RouteMeta { layout?: 'public' | 'community' | 'immersive'; requiresAuth?: boolean; title?: string }
}

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: (to, _from, saved) => to.path === '/community'
    ? { left: 0, top: useCommunityStore().feeds[`${to.query.mode || 'for_you'}:${to.query.type || 'all'}`]?.scroll || 0 }
    : saved || { top: 0 },
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue'), meta: { title: '探索首页' } },
    { path: '/welcome', name: 'welcome', component: () => import('./views/HomeView.vue'), meta: { title: '品牌门户', layout: 'public' } },
    { path: '/community', component: () => import('./community/CommunityFeedView.vue'), meta: { title: '学习社区', requiresAuth: true, layout: 'community' } },
    { path: '/community/post/:postId', component: () => import('./community/CommunityPostView.vue'), meta: { title: '学习讨论', requiresAuth: true, layout: 'community' } },
    { path: '/community/topic/:slug', component: () => import('./community/CommunityCollectionView.vue'), meta: { title: '学习话题', communityView: 'topic', requiresAuth: true, layout: 'community' } },
    { path: '/community/user/:username', component: () => import('./community/CommunityCollectionView.vue'), meta: { title: '社区主页', communityView: 'user', requiresAuth: true, layout: 'community' } },
    { path: '/community/search', component: () => import('./community/CommunityCollectionView.vue'), meta: { title: '社区搜索', communityView: 'search', requiresAuth: true, layout: 'community' } },
    { path: '/bookmarks', component: () => import('./community/CommunityCollectionView.vue'), meta: { title: '收藏与笔记', communityView: 'bookmarks', requiresAuth: true, layout: 'community' } },
    { path: '/notifications', component: () => import('./community/NotificationsView.vue'), meta: { title: '消息通知', requiresAuth: true, layout: 'community' } },
    { path: '/__homepage-preview', name: 'homepage-preview', component: () => import('./views/HomepagePreviewView.vue'), meta: { title: '首页草稿预览' } },
    { path: '/topics', name: 'topics', component: () => import('./views/TopicsView.vue'), meta: { title: '学习主题' } },
    { path: '/courses/:courseId', name: 'course', component: () => import('./views/CourseView.vue'), meta: { title: '课程学习' } },
    { path: '/labs', name: 'labs', component: () => import('./views/LabsView.vue'), meta: { title: '实训项目' } },
    { path: '/labs/:labId', name: 'lab', component: () => import('./views/LabWorkspaceView.vue'), meta: { title: '实训工作台', dark: true } },
    { path: '/resources', name: 'resources', component: () => import('./views/ResourcesView.vue'), meta: { title: '资源中心' } },
    { path: '/frontier', name: 'frontier', component: () => import('./views/FrontierView.vue'), meta: { title: 'AI 前沿' } },
    { path: '/assessments', name: 'assessments', component: () => import('./views/AssessmentsView.vue'), meta: { title: '挑战与测评' } },
    { path: '/profile', name: 'profile', component: () => import('./views/ProfileView.vue'), meta: { title: '个人中心' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.restore()
  const publicPage = ['/', '/welcome', '/__homepage-preview'].includes(to.path)
  if (!publicPage) { to.meta.requiresAuth = true; to.meta.layout = to.meta.dark ? 'immersive' : 'community' }
  else to.meta.layout = 'public'
  if (to.path === '/' && auth.user) return '/community'
  if (to.meta.requiresAuth && !auth.user) return { path: '/', query: { login: '1', redirect: to.fullPath } }
})

router.afterEach((to) => {
  document.title = `${String(to.meta.title)}｜AI数智化学习平台`
})

export default router
