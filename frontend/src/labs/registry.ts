import type { LabDefinition, LabStep, LabType } from './types'

const steps = (names: string[]): LabStep[] => names.map((title, index) => ({
  id: `step-${index + 1}`,
  title,
  minutes: 10 + index * 3,
}))

const common = (
  id: string,
  type: LabType,
  title: string,
  subtitle: string,
  category: string,
  level: string,
  duration: number,
  coverVariant: string,
  stepNames: string[],
  task: string,
  result: string,
): LabDefinition => ({
  id,
  type,
  title,
  subtitle,
  category,
  level,
  duration,
  coverVariant,
  steps: steps(stepNames),
  tools: [{ id: `${type}-simulator`, label: `${category}模拟器`, mode: 'simulated' }],
  initialProgress: 20,
  scoring: [
    { label: '流程完成', points: 30 },
    { label: '配置正确', points: 30 },
    { label: '结果验证', points: 20 },
    { label: '安全边界', points: 20 },
  ],
  relatedResourceIds: ['resource-1', 'resource-2', 'resource-3', 'resource-4', 'resource-5'],
  task,
  hints: ['先阅读步骤目标，再运行模拟。', '所有输出均为浏览器内演示，不连接真实服务。'],
  logs: ['[ready] 初始化浏览器内受控环境', '[check] 校验实验配置', '[run] 执行前端状态机', '[verify] 验证模拟输出', '[done] 实验流程完成'],
  result,
})

const definitions: LabDefinition[] = [
  {
    ...common('agent-workbench', 'agent', 'AI Agent 智能助手开发实训', '构建理解问题、规划步骤并调用白名单工具的智能 Agent。', 'AI Agent', '进阶', 110, 'agent', ['环境准备', '需求分析', 'Agent 设计', '工具配置', '测试与调优', '发布与评估'], '设计一个天气活动建议 Agent，并说明信息边界。', '演示 Agent 已完成意图识别、任务规划、白名单工具调用与结果生成。'),
    tools: [
      { id: 'weather', label: '天气查询', mode: 'simulated' },
      { id: 'calculator', label: '计算器', mode: 'simulated' },
    ],
  },
  common('rag-lab', 'agent', '构建校园知识库 Agent', '用受控检索结果生成带来源提示的校园问答。', 'AI Agent', '中级', 95, 'agent', ['资料准备', '切分策略', '检索配置', '回答模板', '来源校验', '结果评估'], '配置校园知识检索与来源引用流程。', '演示回答已生成，并标注“资料来源待真实知识库接入”。'),
  common('model-service', 'deployment', '部署你的第一个 AI 模型', '模拟模型加载、服务启动、健康检查和 API 测试。', '模型部署', '中级', 90, 'deployment', ['选择模型', '检查环境', '配置参数', '加载模型', '启动服务', '健康检查', '测试 API', '生成报告'], '为轻量文本分类模型配置受控推理服务。', '模拟服务状态为 Running，健康检查通过；未下载模型或开放真实端口。'),
  common('monitor', 'deployment', '模型服务监控演练', '识别模拟延迟告警并完成服务健康检查。', '模型部署', '中级', 70, 'deployment', ['读取指标', '识别告警', '检查环境', '调整参数', '重启模拟', '验证恢复', '记录影响', '生成报告'], '定位模拟服务延迟升高的原因并验证恢复。', '模拟 P95 延迟已恢复到阈值内；未连接真实监控服务。'),
  common('linux-command', 'command', 'Linux 命令训练', '在白名单模拟终端中完成文件与进程认知任务。', 'Linux 命令', '入门', 60, 'command', ['认识目录', '查看文件', '创建目录', '读取内容', '查找文本', '查看进程'], '使用允许命令完成模拟工作区探索。', '已完成白名单命令训练；没有执行任何真实 Shell 命令。'),
  common('git-cli', 'command', '命令行协作入门', '用安全模拟命令理解文件、日志和协作目录。', 'Linux 命令', '入门', 55, 'command', ['进入项目', '查看文件', '创建笔记', '复制模板', '查找内容', '检查进程'], '使用白名单命令整理一份协作说明。', '协作目录已在内存模拟文件系统中完成整理。'),
  common('hardware', 'hardware', 'AI 硬件认知实验', '连接虚拟传感器、读取温度并配置告警阈值。', '智能硬件', '入门', 75, 'hardware', ['识别开发板', '选择传感器', '建立虚拟连接', '读取温度', '设置阈值', '验证告警'], '让虚拟温度传感器在超过阈值时触发告警。', '虚拟传感器已触发阈值告警；未访问 WebUSB、蓝牙或串口。'),
  common('sensor', 'hardware', '传感器数据采集模拟', '观察模拟数据流并完成稳定性判断。', '智能硬件', '中级', 80, 'hardware', ['选择采样源', '配置频率', '开始采集', '观察波动', '设置范围', '验证结果'], '配置模拟温湿度采样并判断异常数据。', '模拟采样完成，异常值已在浏览器状态中标记。'),
  common('campus-agent', 'project', '校园 AI 问答助手', '完成带来源说明的校园问答产品原型。', '综合项目', '进阶', 120, 'agent', ['需求分析', '方案设计', '资源选择', '模块搭建', '运行验证', '成果说明'], '设计校园办事问答助手，输出来源提示和人工求助入口。', '校园问答原型已生成演示成果说明，真实知识库与用户服务待接入。'),
  common('energy-analysis', 'project', '宿舍用电智能分析原型', '用模拟用电数据发现趋势并提出节能建议。', '综合项目', '中级', 100, 'hardware', ['需求分析', '数据定义', '指标设计', '模块搭建', '趋势验证', '成果说明'], '分析模拟宿舍用电曲线并标记异常时段。', '用电分析原型已生成趋势摘要，真实传感数据接口待接入。'),
  common('image-web', 'project', '图像分类 Web 应用', '设计图片输入、分类结果与可信提示的前端原型。', '综合项目', '中级', 90, 'image', ['需求分析', '交互设计', '模型选择', '模块搭建', '结果验证', '成果说明'], '完成图像分类页面流程并说明模型不确定性。', '图像分类 Web 原型已生成演示结果，真实模型推理接口待接入。'),
]

export const labRegistry = new Map(definitions.map((definition) => [definition.id, definition]))

export const getLabDefinition = (labId: string) => labRegistry.get(labId)

export const labDefinitions = definitions
