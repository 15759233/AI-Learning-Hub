export type Category = '大模型 LLM' | 'AI Agent' | '图像生成' | '模型部署' | '智能硬件' | 'AI 安全'

export interface Course {
  id: string
  title: string
  description: string
  category: Category
  level: '入门' | '初级' | '中级' | '高级'
  hours: number
  learners: number
  progress?: number
  mode: '视频' | '图文' | '实战项目' | '互动实验'
}

export interface Lab {
  id: string
  title: string
  description: string
  category: '模型部署' | 'AI Agent' | 'Linux 命令' | '智能硬件'
  level: '入门' | '中级' | '进阶'
  minutes: number
  steps: number
  completion: number
  learners: number
}

export interface ResourceItem {
  id: string
  title: string
  category: string
  theme: '大模型' | 'Agent' | '编程工具' | '智能硬件'
  difficulty: '入门' | '中级' | '进阶'
  format: 'PDF' | 'DOCX' | 'PPTX' | 'ZIP' | 'TXT'
  featured: boolean
  downloads: number
  updatedAt: string
}

export interface Article {
  id: string
  title: string
  summary: string
  category: '大模型' | 'Agent' | '多模态' | '机器人' | 'AI 安全'
  readMinutes: number
  publishedAt: string
}
