import type { CommunityPostType } from '@ai-learning-hub/contracts'
export const postLabels: Record<CommunityPostType, string> = { question: '学习问答', note: '学习笔记', lab_result: '实训成果', project: '创客项目', frontier_discussion: '前沿讨论', achievement: '学习成就', general: '学习交流' }
export const badgeLabels = { none: '', teacher: '认证教师', official: '官方', mentor: '学习导师' }
export const communityNavigation = [
  { label: '社区首页', path: '/community', icon: 'message' }, { label: '学习主题', path: '/topics', icon: 'layers' },
  { label: '实训项目', path: '/labs', icon: 'terminal' }, { label: '资源中心', path: '/resources', icon: 'folder' },
  { label: 'AI 前沿', path: '/frontier', icon: 'sparkles' }, { label: '挑战与测评', path: '/assessments', icon: 'trophy' },
  { label: '我的成长', path: '/profile', icon: 'chart' }, { label: '收藏与笔记', path: '/bookmarks', icon: 'bookmark' },
  { label: '消息通知', path: '/notifications', icon: 'bell' },
]
