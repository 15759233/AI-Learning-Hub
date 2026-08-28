import { createRouter, createWebHistory } from 'vue-router'
import { courses } from './data/mock'
import { getLabDefinition } from './labs/registry'

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'home', component: () => import('./views/HomeView.vue'), meta: { title: '探索首页' } },
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

router.afterEach((to) => {
  const courseTitle = to.name === 'course' ? courses.find((course) => course.id === to.params.courseId)?.title : ''
  const labTitle = to.name === 'lab' ? getLabDefinition(String(to.params.labId))?.title : ''
  document.title = `${courseTitle || labTitle || String(to.meta.title)}｜AI MAKER CAMPUS`
})

export default router
