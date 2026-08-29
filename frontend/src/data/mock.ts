import { reactive } from 'vue'
import heroCampus from '../assets/hero-campus.webp'
import learningCover from '../assets/learning-cover.webp'
import labCover from '../assets/lab-cover.webp'
import type { Article, Course, Lab, ResourceItem } from '../types'

// 演示数据：仅用于学生端首版交互验证，待后端接口确定后由 service 替换。
export const assets = { heroCampus, learningCover, labCover }

export const courses = reactive<Course[]>([
  { id: 'llm-zero', title: '从零理解大语言模型', description: '理解 Transformer、训练与推理的核心逻辑。', category: '大模型 LLM', level: '入门', hours: 3.5, learners: 12600, progress: 60, mode: '图文', coverVariant: 'llm', accent: '#6e5bff', icon: 'LLM' },
  { id: 'agent-first', title: '构建你的第一个 AI Agent', description: '从任务规划到工具调用，完成可运行的智能助手。', category: 'AI Agent', level: '初级', hours: 6.2, learners: 9800, progress: 35, mode: '实战项目', coverVariant: 'agent', accent: '#27b86b', icon: '⌘' },
  { id: 'image-create', title: 'AI 绘画与创意表达', description: '掌握提示词、构图与负责任的图像生成。', category: '图像生成', level: '初级', hours: 4.8, learners: 8600, progress: 20, mode: '互动实验', coverVariant: 'image', accent: '#8a5cf6', icon: '◇' },
  { id: 'api-deploy', title: '大模型部署与 API 服务化', description: '在受控环境理解模型服务、监控和发布。', category: '模型部署', level: '中级', hours: 5.6, learners: 7200, progress: 15, mode: '实战项目', coverVariant: 'deployment', accent: '#3478f6', icon: '⬡' },
  { id: 'iot-car', title: 'AIoT 智能小车实验', description: '连接传感器、控制器与轻量 AI 能力。', category: '智能硬件', level: '中级', hours: 8, learners: 6300, mode: '互动实验', coverVariant: 'hardware', accent: '#e5a91d', icon: '▦' },
  { id: 'model-security', title: 'AI 安全与对抗防御基础', description: '识别模型风险并建立负责任的安全边界。', category: 'AI 安全', level: '中级', hours: 4, learners: 5100, mode: '视频', coverVariant: 'security', accent: '#27b86b', icon: '◈' },
  { id: 'rag-practice', title: 'RAG 检索增强生成实战', description: '用可信资料库提升模型回答的准确性。', category: '大模型 LLM', level: '高级', hours: 6.5, learners: 4900, mode: '实战项目', coverVariant: 'llm', accent: '#6e5bff', icon: 'RAG' },
  { id: 'multi-agent', title: '多智能体协作系统构建', description: '设计角色、消息与可观测的协作流程。', category: 'AI Agent', level: '高级', hours: 9.5, learners: 3200, mode: '实战项目', coverVariant: 'agent', accent: '#27b86b', icon: 'A²' },
  { id: 'image-start', title: '3D 生成与虚拟数字人入门', description: '理解生成流程、资产边界与基本工作流。', category: '图像生成', level: '初级', hours: 5, learners: 3000, mode: '视频', coverVariant: 'image', accent: '#8a5cf6', icon: '3D' },
])

export const labs = reactive<Lab[]>([
  { id: 'agent-workbench', title: 'AI Agent 智能助手开发实训', description: '在受控工作台完成规划、工具配置与运行评估。', category: 'AI Agent', level: '进阶', minutes: 110, steps: 6, completion: 60, learners: 7521, coverVariant: 'agent', accent: '#27b86b', icon: '⌘' },
  { id: 'model-service', title: '部署你的第一个 AI 模型', description: '模拟模型服务启动、检查与验证。', category: '模型部署', level: '中级', minutes: 90, steps: 8, completion: 66, learners: 8932, coverVariant: 'deployment', accent: '#3478f6', icon: '⬡' },
  { id: 'linux-command', title: 'Linux 命令训练', description: '使用白名单命令完成文件与进程认知任务。', category: 'Linux 命令', level: '入门', minutes: 60, steps: 6, completion: 71, learners: 7921, coverVariant: 'command', accent: '#344253', icon: '>_' },
  { id: 'hardware', title: 'AI 硬件认知实验', description: '认识算力、传感器和边缘部署链路。', category: '智能硬件', level: '入门', minutes: 75, steps: 6, completion: 66, learners: 8214, coverVariant: 'hardware', accent: '#e5a91d', icon: '▦' },
  { id: 'rag-lab', title: '构建校园知识库 Agent', description: '组合检索、提示词和来源引用。', category: 'AI Agent', level: '中级', minutes: 95, steps: 6, completion: 42, learners: 6810, coverVariant: 'agent', accent: '#27b86b', icon: 'RAG' },
  { id: 'monitor', title: '模型服务监控演练', description: '识别模拟告警并完成健康检查。', category: '模型部署', level: '中级', minutes: 70, steps: 8, completion: 38, learners: 4520, coverVariant: 'deployment', accent: '#3478f6', icon: 'API' },
  { id: 'git-cli', title: '命令行协作入门', description: '用安全的模拟命令理解版本协作。', category: 'Linux 命令', level: '入门', minutes: 55, steps: 6, completion: 53, learners: 6102, coverVariant: 'command', accent: '#344253', icon: 'git' },
  { id: 'sensor', title: '传感器数据采集模拟', description: '观察模拟数据并完成阈值判断。', category: '智能硬件', level: '中级', minutes: 80, steps: 6, completion: 31, learners: 3980, coverVariant: 'hardware', accent: '#e5a91d', icon: '°C' },
])

export const resources = reactive<ResourceItem[]>(Array.from({ length: 12 }, (_, index) => {
  const presets = [
    ['AI 基础学习手册', '学习手册', 'PDF', '大模型'],
    ['提示词结构模板', '提示词模板', 'DOCX', 'Agent'],
    ['Linux 命令速查', '命令速查', 'PDF', '编程工具'],
    ['模型部署检查清单', '部署指南', 'PPTX', '大模型'],
    ['Agent 工具案例包', 'Agent 案例', 'ZIP', 'Agent'],
    ['硬件接口说明', '硬件资料', 'TXT', '智能硬件'],
  ] as const
  const preset = presets[index % presets.length]
  const difficulties = ['入门', '中级', '进阶'] as const
  const variants = { 大模型: 'llm', Agent: 'agent', 编程工具: 'command', 智能硬件: 'hardware' } as const
  return { id: `resource-${index + 1}`, title: `${preset[0]} ${Math.floor(index / 6) + 1}`, category: preset[1], format: preset[2], theme: preset[3], difficulty: difficulties[index % 3], featured: index % 3 === 0, downloads: 920 + index * 217, updatedAt: `2026-08-${String(28 - index).padStart(2, '0')}`, coverVariant: variants[preset[3]], icon: preset[2] }
}))

export const articles = reactive<Article[]>([
  { id: 'agent-tools', title: '从工具调用看 AI Agent 的工程边界', summary: '理解规划、执行、反馈之间的关系，以及何时应该让人参与决策。', category: 'Agent', readMinutes: 8, publishedAt: '2026-08-28', content: ['Agent 不应直接拥有无限制工具权限。应用层需要校验参数、限制工具白名单，并为高风险操作保留人工确认。', '规划、执行和反馈形成可观察闭环，失败状态同样需要被清晰记录。'], coverVariant: 'agent', icon: '⌘' },
  { id: 'moe', title: 'MoE 为什么能让大模型更高效', summary: '用直观方式理解专家混合架构与路由机制。', category: '大模型', readMinutes: 6, publishedAt: '2026-08-26', content: ['MoE 通过路由器为每个输入选择少量专家参与计算，从而在扩大参数规模时控制单次推理成本。', '效率收益依赖稳定路由、负载均衡和部署策略。'], coverVariant: 'llm', icon: 'MoE' },
  { id: 'multimodal', title: '多模态模型如何对齐图像与语言', summary: '从表示空间出发，拆解跨模态学习的基本流程。', category: '多模态', readMinutes: 9, publishedAt: '2026-08-24', content: ['图像与文本会先被编码为可比较的表示，再通过配对数据建立语义对应关系。', '数据质量和评估边界决定了模型是否真正理解跨模态信息。'], coverVariant: 'image', icon: '◇' },
  { id: 'robot', title: '具身智能离校园实验还有多远', summary: '盘点传感、规划和控制中的关键学习任务。', category: '机器人', readMinutes: 7, publishedAt: '2026-08-21', content: ['校园实验适合先从仿真、传感器认知和受控动作开始。', '真实设备接入前必须处理安全范围、权限和异常停止。'], coverVariant: 'hardware', icon: '▦' },
  { id: 'safety', title: '学生开发 AI 应用需要知道的安全边界', summary: '从数据、权限和输出三方面建立安全意识。', category: 'AI 安全', readMinutes: 5, publishedAt: '2026-08-19', content: ['不要把密钥、隐私数据和无限制系统权限交给模型。', '输入校验、最小权限、输出复核和可撤销操作是学生项目的基本安全线。'], coverVariant: 'security', icon: '◈' },
  { id: 'rag', title: 'RAG 的价值不只是让模型知道更多', summary: '可追溯来源与知识更新同样是工程价值。', category: '大模型', readMinutes: 8, publishedAt: '2026-08-17', content: ['RAG 将外部资料检索结果带入回答上下文，让知识更新与来源追踪更清晰。', '检索质量、切片策略和引用验证比堆积文档数量更重要。'], coverVariant: 'llm', icon: 'RAG' },
  { id: 'function-call', title: 'Function Calling 的最小心智模型', summary: '模型负责选择工具，应用负责验证和执行。', category: 'Agent', readMinutes: 6, publishedAt: '2026-08-15', content: ['模型可以建议调用哪个工具，但应用必须验证工具名称和参数。', '真正执行动作的是受控程序，不是模型本身。'], coverVariant: 'agent', icon: 'fn' },
  { id: 'alignment', title: '多模态对齐中的数据质量问题', summary: '错误配对与偏差如何影响模型学习。', category: '多模态', readMinutes: 10, publishedAt: '2026-08-12', content: ['错误配对会让模型学习到不稳定关联，偏差数据还会放大不公平结果。', '建立可追溯的数据抽样与人工复核流程是基础。'], coverVariant: 'image', icon: '≋' },
])

export const makerProjects = reactive([
  { id: 'campus-agent', title: '校园 AI 问答助手', description: '用 LLM、RAG 与提示词搭建可追溯回答的校园助手。', skills: 'LLM · RAG · 前端', steps: 6, duration: '2 周', coverVariant: 'agent', icon: 'QA' },
  { id: 'energy-analysis', title: '宿舍用电智能分析原型', description: '从模拟传感数据中发现异常趋势并输出节能建议。', skills: '数据分析 · 可视化', steps: 6, duration: '1.5 周', coverVariant: 'hardware', icon: 'kWh' },
  { id: 'image-web', title: '图像分类 Web 应用', description: '完成模型调用、结果展示与安全边界说明。', skills: '模型部署 · Web', steps: 6, duration: '1 周', coverVariant: 'image', icon: 'IMG' },
])

export const studentActivities = reactive([
  { student: '林同学', action: '完成模型部署实训', time: '刚刚', points: '+120 经验值' },
  { student: '周同学', action: '解锁 Agent 徽章', time: '10 分钟前', points: '+80 经验值' },
  { student: '陈同学', action: '通过本周挑战', time: '30 分钟前', points: '+150 经验值' },
  { student: '杨同学', action: '发布校园问答成果', time: '1 小时前', points: '+100 经验值' },
])

export const assessmentAchievements = reactive([
  { title: '初次挑战', icon: '◆', unlocked: true, description: '完成第一次能力挑战' },
  { title: '稳定发挥', icon: '⬢', unlocked: true, description: '连续三次正确率超过 80%' },
  { title: '错题清零', icon: '✦', unlocked: true, description: '完成一次错题专项练习' },
  { title: '本周之星', icon: '✹', unlocked: true, description: '进入本周排行榜前 20%' },
  { title: '全栈能力', icon: '⌘', unlocked: false, description: '八个知识点全部超过 85%' },
  { title: '测评达人', icon: '◇', unlocked: false, description: '累计完成十次综合测评' },
])

export const userProfile = reactive({
  name: '造梦少年',
  school: '高校认证',
  program: 'AI 创客学院 · 计算机科学与技术 · 大二',
  level: 28,
  experience: 12800,
  streak: 24,
  weeklyHours: 12.6,
  points: 3280,
})
