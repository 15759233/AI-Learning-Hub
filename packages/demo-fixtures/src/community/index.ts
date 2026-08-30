import type { CommunityContentBlock, CommunityPostType, CommunityVerifiedType, LearningContentType } from '../../../contracts/src/community'

interface Catalog { courses: Array<{ slug: string; title: string; summary: string; theme: string }>; labs: Array<{ slug: string; title: string; summary: string; labType: string; result: string; skills: string[] }>; articles: Array<{ slug: string; title: string; summary: string }>; themes: Array<{ slug: string; title: string }>; students: Array<{ username: string; displayName: string; major: string; grade: string }> }
export interface CommunityFixturePost {
  id: string; author: string; type: CommunityPostType; title: string; blocks: CommunityContentBlock[]
  bindings: Array<{ type: LearningContentType; id: string }>; topics: string[]; visibility: 'public' | 'school'; publishedAt: string
}
export function createCommunityFixtures(catalog: Catalog, asOf = new Date()) {
  const extraStudents = ['沈一', '陆遥', '程宁', '叶岚', '吴桐', '许知'].map((displayName, index) => ({ username: `community-learner-${index + 1}`, displayName, major: '智能科学与技术', grade: '大二' }))
  const students = [...catalog.students, ...extraStudents].slice(0, 18)
  const officials = ['AI 学习助手', '实训指导老师', '课程运营', '校园创客社'].map((displayName, index) => ({ username: `campus-guide-${index + 1}`, displayName, major: 'AI 创客学院', grade: '', verifiedType: 'official' as CommunityVerifiedType }))
  const guides = [{ username: 'community-teacher', displayName: '陈老师', major: '人工智能', grade: '', verifiedType: 'teacher' as CommunityVerifiedType }, { username: 'community-mentor', displayName: '周导师', major: '计算机科学', grade: '', verifiedType: 'mentor' as CommunityVerifiedType }]
  const users = [...students.map((user) => ({ ...user, verifiedType: 'none' as CommunityVerifiedType })), ...officials, ...guides]
  const topicNames = [
    ['attention', '注意力机制', 'llm'], ['rag', '检索增强生成', 'llm'], ['prompt', '提示词设计', 'llm'], ['finetune', '模型微调', 'llm'],
    ['tool-calling', '工具调用', 'agent'], ['multi-agent', '多智能体', 'agent'], ['agent-memory', 'Agent 记忆', 'agent'], ['agent-evaluation', '智能体评测', 'agent'],
    ['image-prompt', '图像提示词', 'image'], ['comfyui', '节点工作流', 'image'], ['visual-story', '视觉表达', 'image'], ['copyright', 'AI 版权', 'image'],
    ['linux', 'Linux 入门', 'deployment'], ['docker', 'Docker 部署', 'deployment'], ['fastapi', '模型 API', 'deployment'], ['observability', '运行监控', 'deployment'],
    ['gpu', 'GPU 与显存', 'hardware'], ['sensors', '传感器实践', 'hardware'], ['edge-ai', '边缘 AI', 'hardware'], ['campus-maker', '校园创客', 'hardware'],
    ['privacy', '隐私保护', 'security'], ['injection', '提示词注入', 'security'], ['permission', '最小权限', 'security'], ['responsible-ai', '负责任 AI', 'security'],
  ]
  const topics = topicNames.map(([slug, name, theme], index) => ({ id: `community-topic-${slug}`, slug, name, theme, description: `围绕${name}分享理解、提出问题和交流实践；请带上课程或实训上下文。`, accent: ['purple', 'green', 'purple', 'blue', 'yellow', 'teal'][Math.floor(index / 4)], sortOrder: index, recommended: index % 4 === 0 }))
  const questionTitles = [
    ['Transformer 中 Query、Key、Value 应该怎样直观理解？', 'llm-zero'],
    ['为什么 RAG 检索到了资料，模型还是回答错误？', 'rag-practice'],
    ['Agent 工具调用失败时应该先检查哪几个环节？', 'function-calling'],
    ['Linux 中相对路径和绝对路径什么时候使用？', 'linux-basics'],
    ['容器启动了，为什么浏览器仍然访问不到模型？', 'docker-models'],
    ['短期会话状态和长期记忆应该怎样分开？', 'agent-memory'],
    ['多智能体意见冲突时，怎样设计结束条件？', 'multi-agent'],
    ['为什么验证集准确率比训练集更低？', 'llm-finetune'],
    ['提示词里放示例会不会让模型只会模仿？', 'prompt-basics'],
    ['图像生成中固定种子能保证完全相同吗？', 'stable-diffusion'],
    ['ComfyUI 节点输出的尺寸为什么不一致？', 'comfyui'],
    ['局部重绘如何保持其他区域不变？', 'image-editing'],
    ['生成的图片可以直接放进课程作业吗？', 'generative-ethics'],
    ['FastAPI 返回错误时该保留哪些诊断字段？', 'fastapi-inference'],
    ['KV Cache 为什么会增加显存占用？', 'vllm-basics'],
    ['选择开发板时先看算力还是内存？', 'gpu-memory'],
    ['传感器连续两次超过阈值就应告警吗？', 'aiot-basics'],
    ['边缘设备断网后如何保持基本能力？', 'edge-ai'],
    ['引用资料中出现指令时怎样防止被执行？', 'prompt-injection'],
    ['校园助手需要收集同学的学号吗？', 'ai-privacy'],
    ['智能体评测如何避免只看最终回答？', 'agent-evaluation'],
    ['检索分块越小是否一定越准确？', 'rag-practice'],
    ['工具参数校验应该放在模型之前还是之后？', 'function-calling'],
    ['模型服务健康检查与业务成功是什么关系？', 'fastapi-inference'],
    ['学习记录留存时间应该怎样选择？', 'ai-privacy'],
  ]
  const noteTitles = ['我用输入与输出理解注意力机制', 'RAG 回答错误的排查顺序', 'Function Calling 的四个关键步骤', '相对路径与工作目录学习笔记', 'Docker 容器端口检查清单', '把 Agent 记忆分成三层', '多智能体协作的停止条件', '微调前先做好数据划分', '提示词中的目标与约束', '扩散模型采样过程学习图解', '我的 ComfyUI 节点整理方式', '局部重绘的遮罩检查顺序', 'AI 作品引用和版权自查', 'FastAPI 模型接口输入校验', '读懂 vLLM 的显存指标', '第一次估算推理显存需求', '传感器异常值处理笔记', '边缘设备离线降级清单', '提示词注入与可信边界', '校园 AI 应用的数据最小化']
  const posts: CommunityFixturePost[] = []
  const dayStart = Date.UTC(asOf.getUTCFullYear(), asOf.getUTCMonth(), asOf.getUTCDate())
  const add = (type: CommunityPostType, title: string, body: string, bindingType: LearningContentType, slug: string, theme: string, index: number, author?: string, code?: string) => {
    const id = `community-${type}-${index + 1}`
    const blocks: CommunityContentBlock[] = [{ type: 'paragraph', text: body }]
    if (code) blocks.push({ type: 'code', language: 'text', code })
    posts.push({ id, author: author || students[index % students.length].username, type, title, blocks, bindings: [{ type: bindingType, id: slug }], topics: [topics.filter((topic) => topic.theme === theme)[index % 4]?.id || topics[0].id], visibility: index % 7 === 6 ? 'school' : 'public', publishedAt: new Date(dayStart - (posts.length * 7 + index % 3) * 3600000).toISOString() })
  }
  questionTitles.forEach(([title, slug], index) => {
    const course = catalog.courses.find((course) => course.slug === slug)!
    add('question', title, `正在学习《${course.title}》：${course.summary} 我已经读过课程说明并尝试按步骤拆解输入和输出，但对“${title.replace(/？$/, '')}”还没有形成清晰判断。希望大家结合课程里的具体场景，解释适用条件与验证方法；如果需要补充上下文，我会继续完善。`, 'course', slug, course.theme, index)
  })
  noteTitles.forEach((title, index) => {
    const course = catalog.courses.find((course) => course.slug === questionTitles[index][1])!
    add('note', title, `学习《${course.title}》后，我把“${title}”整理成一个小结。先说明问题与输入，再记录步骤，最后用一个失败情形检查理解是否成立。${course.summary} 对我最有帮助的是把“运行成功”和“结果可信”分开验证。下一步准备进入相关实训，用自己的操作记录检验这些结论。`, 'course', course.slug, course.theme, index, undefined, index % 4 === 0 ? '目标 → 输入检查 → 受控执行 → 结果验证 → 记录边界' : undefined)
  })
  for (let index = 0; index < 15; index++) {
    const lab = catalog.labs[index % catalog.labs.length]
    add('lab_result', `${lab.title}：${index < catalog.labs.length ? '完成后的排障与复盘' : '换一个输入再验证'}`, `我已在受控工作台提交《${lab.title}》。使用能力：${lab.skills.join('、')}。结果摘要：${lab.result}。关键步骤是先确认输入，再逐项检查状态转换与结果；这次学到，日志中出现成功信息并不等于业务目标完成，仍需核对预期输出。这里只分享学习总结，不包含内部日志、密钥或完整评分细则。`, 'lab', lab.slug, lab.labType === 'hardware' ? 'hardware' : lab.labType === 'agent' ? 'agent' : 'deployment', index)
    posts.at(-1)!.bindings.push({ type: 'lab_run', id: `community-run-${index + 1}` })
  }
  const projectTitles = ['校园 AI 问答助手：来源引用第一版', '宿舍能耗分析原型：先画出日趋势', '图像分类 Web 应用：补齐错误态', '校园知识助手：增加最小权限检查', '宿舍用电分析：区分波动与异常', '图像分类页面：解释模型的边界', 'AI 学习计划 Agent：先验证知识来源', '校园助手的多轮问题整理']
  projectTitles.forEach((title, index) => {
    const labs = catalog.labs.filter((lab) => lab.labType === 'project'), lab = labs[index % labs.length]
    add('project', title, `基于现有综合实训《${lab.title}》完成了这个阶段的原型。项目能力：${lab.skills.join('、')}；当前进度是核心流程已完成，正在检查输入异常、空结果和隐私说明。我的成果重点是${lab.result}。欢迎围绕数据来源、交互反馈和验证方法提出建议，后续继续在同一项目实训里迭代。`, 'lab', lab.slug, 'agent', index)
  })
  catalog.articles.slice(0, 12).forEach((article, index) => add('frontier_discussion', `读《${article.title}》：对学习与实践有什么影响？`, `文章摘要：${article.summary}。我的观点是，新能力值得尝试，但要先说明评测条件和失败边界，再决定是否引入课程项目。读完后我想和大家讨论：它解决的是理解问题、工程问题，还是使用体验问题？欢迎带上原文依据和自己的学习场景。`, 'article', article.slug, ['agent', 'llm', 'security'][index % 3], index))
  const guidance = ['提问前，把可复现上下文带上', '完成实训后怎样写有帮助的复盘', '一周学习计划从小目标开始', '校园创客作品的展示清单', '代码块分享前先移除敏感配置', '如何判断一份学习资料是否可信', '给同学的回答添加验证步骤', '先学概念，再进入受控实训', '把测评结果变成下一步学习任务', '让作品说明保留真实能力边界']
  guidance.forEach((title, index) => { const course = catalog.courses[index % catalog.courses.length]; add('general', title, `本周学习指导：${title}。可以从《${course.title}》开始，先阅读目标与材料，再写下自己的理解或疑问。分享时请注明关联内容、已尝试的方法和结果；不要公开其他同学的个人信息，也不要把受控模拟结果说成真实生产部署。欢迎在评论里交流你的学习计划。`, 'course', course.slug, course.theme, index, officials[index % officials.length].username) })
  const comments = posts.flatMap((post, index) => [
    { id: `community-comment-${index * 2 + 1}`, postId: post.id, author: users[(index + 3) % users.length].username, parentId: null as string | null, body: `关于“${post.title}”，我建议先回到关联课程或实训，列出当前输入、预期结果和实际结果，再一次只改变一个条件。这样比较容易区分概念理解问题和操作问题，也方便其他同学复现。` },
    { id: `community-comment-${index * 2 + 2}`, postId: post.id, author: post.author, parentId: `community-comment-${index * 2 + 1}`, body: `谢谢补充。我会按这个顺序复核“${post.title}”涉及的步骤，把不确定的地方和验证结果补到这条讨论中。能明确解释适用条件，比只得到一次成功结果更有帮助。` },
  ])
  const reactions = posts.flatMap((post, index) => students.slice(0, 3 + index % 7).flatMap((user, position) => [{ postId: post.id, username: user.username, type: (position % 3 === 0 ? 'useful' : 'like') as 'like' | 'useful' }]))
  const bookmarks = posts.flatMap((post, index) => students.slice(0, 1 + index % 4).map((user) => ({ postId: post.id, username: user.username })))
  const follows = students.flatMap((user, index) => [officials[index % officials.length].username, students[(index + 1) % students.length].username].map((followee) => ({ follower: user.username, followee })))
  const impressions = posts.map((post, index) => ({ id: `community-impression-${index + 1}`, postId: post.id, username: students[(index + 2) % students.length].username, occurredAt: post.publishedAt, clicked: index % 3 === 0 }))
  const notifications = [{ id: 'community-welcome-guide', recipient: students[0].username, actor: officials[0].username, type: 'official' as const, entityType: 'post', entityId: posts.find((post) => post.type === 'general')!.id, text: '欢迎来到学习社区，先从学习指导与关联课程开始。', createdAt: new Date(dayStart).toISOString() }]
  return { users, topics, posts, comments, reactions, bookmarks, follows, impressions, notifications }
}
