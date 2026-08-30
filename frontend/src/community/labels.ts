import type { CommunityPostType } from '@ai-learning-hub/contracts'
export const postLabels: Record<CommunityPostType, string> = { question: '学习问答', note: '学习笔记', lab_result: '实训成果', project: '创客项目', frontier_discussion: '前沿讨论', achievement: '学习成就', general: '学习交流' }
export const badgeLabels = { none: '', teacher: '认证教师', official: '官方', mentor: '学习导师' }
export const communityNavigation = [
  { label: '社区首页', path: '/community', icon: 'message', desktop: true, mobile: true, mobileOrder: 1, requiresAuth: true },
  { label: '学习主题', path: '/topics', icon: 'layers', desktop: true, mobile: true, mobileOrder: 2, requiresAuth: false },
  { label: '实训项目', path: '/labs', icon: 'terminal', desktop: true, mobile: false, mobileOrder: 0, requiresAuth: false },
  { label: '资源中心', path: '/resources', icon: 'folder', desktop: true, mobile: false, mobileOrder: 0, requiresAuth: false },
  { label: 'AI 前沿', path: '/frontier', icon: 'sparkles', desktop: true, mobile: false, mobileOrder: 0, requiresAuth: false },
  { label: '挑战与测评', path: '/assessments', icon: 'trophy', desktop: true, mobile: false, mobileOrder: 0, requiresAuth: false },
  { label: '我的成长', path: '/profile', icon: 'chart', desktop: true, mobile: true, mobileOrder: 5, requiresAuth: true },
  { label: '收藏与笔记', path: '/bookmarks', icon: 'bookmark', desktop: true, mobile: false, mobileOrder: 0, requiresAuth: true },
  { label: '消息通知', path: '/notifications', icon: 'bell', desktop: true, mobile: true, mobileOrder: 4, requiresAuth: true },
  { label: '草稿箱', path: '/community/drafts', icon: 'edit', desktop: true, mobile: false, mobileOrder: 0, requiresAuth: true },
]
