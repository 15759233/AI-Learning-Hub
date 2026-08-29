# 开发任务覆盖矩阵

本矩阵对应《AI-Learning-Hub 后台、数据库与前台数据互通开发任务》1842 行要求。重复字段清单按同一领域合并，但每个章节与显式纵切均有结论。

状态仅使用：

- **实现**：存在可运行代码、迁移、测试或文档。
- **真实外部阻塞**：内部适配边界已完成，但缺少用户未提供的真实外部端点或密钥。
- **不适用**：要求为流程建议，或明确超出本次局域网开发测试范围。

| 编号 | 要求 | 状态 | 实现或证据 |
| --- | --- | --- | --- |
| 01 | 管理端、服务端、PostgreSQL、存储、学生端互通 | 实现 | `admin-web/`、`server/`、`server/prisma/`、`frontend/src/services/api/` |
| 02.1 | 后台按学生端板块构建并保持简化操作 | 实现 | `admin-web/src/router.ts`、`admin-web/src/views/` |
| 02.2 | PostgreSQL 单一正式数据源，API 失败不回退 Mock | 实现 | `frontend/src/services/api/client.ts`、`frontend/src/stores/learning.ts` |
| 03 | 工程盘点、任务拆分、阻塞与独立审查 | 实现 | 本机结构化知识与外挂看板执行；按项目规则不入 Git |
| 04 | 约定工程目录 | 实现 | `admin-web/`、`server/`、`packages/contracts/`、`docs/` |
| 05 | Vue 3 双端、NestJS 模块化单体、Prisma/PostgreSQL | 实现 | `docs/architecture.md`、各工程 `package.json` |
| 06 | 统一响应、分页、状态与 DTO 契约 | 实现 | `packages/contracts/src/index.ts`、`server/src/common/` |
| 07.1 | 通用主键、时间、状态、排序、软删除、版本规则 | 实现 | `server/prisma/schema.prisma` |
| 07.2 | 用户、学校、院系、第三方身份、RBAC、登录日志 | 实现 | `schema.prisma`；`auth/`；`catalog/admin-platform.controller.ts` |
| 07.2-WX | 微信小程序安全 `code` 换取接口 | 真实外部阻塞 | `integrations/wechat/` 与 E2E 503 边界已实现；缺真实 AppID/Secret |
| 07.3 | 首页模块、推荐项、发布快照、失效目标过滤 | 实现 | `HomepageModuleVersion`、`HomepagePublication`；`catalog.service.ts` |
| 07.4 | 学习主题、版本、路径、阶段、内容关联 | 实现 | `ThemeVersion`、`LearningPath*`；管理端主题工具 |
| 07.5 | 课程、教师、资源、实训关联、章节、课时、内容块 | 实现 | `Course*`、`Lesson*`；课程结构管理接口 |
| 07.6 | 实训版本、步骤、工具、资源、运行快照、事件、报告 | 实现 | `Lab*` 模型；`behavior.service.ts`；管理端实训工具 |
| 07.7 | 文件、资源分类/版本/标签、浏览与下载 | 实现 | `Resource*`、`FileRecord`；`storage/` |
| 07.8 | 文章分类/标签/版本、定时发布、推荐位与阅读统计 | 实现 | `Article*`；文章 schedule/recommendations 接口 |
| 07.9 | 挑战、规则、题库、知识点、选项、试卷、作答、错题、排行榜 | 实现 | `Challenge*`、`Question*`、`Paper*`、`Assessment*`、`RankingSnapshot` |
| 07.10 | 积分、徽章、证书、计划、活动、学习与内容统计、推荐 | 实现 | `Growth*`、`Achievement*`、`Certificate*`、`Daily*`、`UserRecommendation` |
| 07.11 | 设置、通知、已读、审计、操作日志、外部映射与同步任务 | 实现 | `SystemSetting`、`Notification*`、`AuditLog`、`OperationLog`、`ExternalMapping`、`SyncJob` |
| 08 | 草稿/已发布双指针、不可变快照、发布/撤回一致性 | 实现 | `CourseVersion`、`LabVersion`、`ArticleVersion`、`QuestionVersion` 与 E2E 快照回归 |
| 09.1 | 邮箱密码、Refresh 轮换、注销、身份绑定 | 实现 | `auth.controller.ts`、`auth.service.ts` |
| 09.2 | 公开内容接口只读已发布数据 | 实现 | `catalog/public.controller.ts`、`catalog.service.ts` |
| 09.3 | 学习、收藏、笔记、实训、测评、成长回写 | 实现 | `behavior.controller.ts`、`behavior.service.ts` |
| 09.4 | 管理 CRUD、筛选、排序、发布、日志与统计 API | 实现 | `admin.controller.ts`、`admin-platform.controller.ts` |
| 10.1 | 管理后台全局外壳、菜单、面包屑、身份与退出 | 实现 | `AdminLayout.vue`、`AdminSidebar.vue`、`AdminHeader.vue` |
| 10.2 | 数据看板、指标与趋势图 | 实现 | `DashboardView.vue`、`TrendChart.vue` |
| 10.3 | 首页运营编辑、推荐项与发布 | 实现 | `HomepageView.vue` |
| 10.4 | 学习主题、路径与阶段管理 | 实现 | `ManagementView.vue`、`ManagementTools.vue` |
| 10.5 | 课程、章节、课时和内容块管理 | 实现 | `ManagementTools.vue`、课程管理 API |
| 10.6 | 实训步骤、工具、运行与报告管理 | 实现 | `ManagementTools.vue`、实训管理 API |
| 10.7 | 资源筛选、上传、发布与统计 | 实现 | `ManagementView.vue`、资源/文件 API |
| 10.8 | 文章定时发布与推荐位 | 实现 | `ManagementTools.vue`、文章管理 API |
| 10.9 | 题库、试卷、挑战规则、排行榜 | 实现 | `ManagementTools.vue`、挑战管理 API |
| 10.10 | 用户成长、模块开关、徽章、证书与记录 | 实现 | `GrowthView.vue`、成长管理 API |
| 10.11 | 系统设置、组织、通知与日志 | 实现 | `SettingsView.vue`、平台管理 API |
| 11.1 | 学生端统一 API 服务层 | 实现 | `frontend/src/services/api/` |
| 11.2 | 显式 `mock/api` 模式 | 实现 | `frontend/.env.example`、`api/client.ts` |
| 11.3 | 首页、主题、课程、实训、资源、资讯、挑战真实读取 | 实现 | `content.ts`、`frontend/src/stores/learning.ts` |
| 11.4 | Pinia 认证、加载、错误与行为状态 | 实现 | `frontend/src/stores/auth.ts`、`learning.ts` |
| 11.5 | 管理发布→学生读取、学生行为→管理查询 | 实现 | `server/test/platform.e2e.spec.ts` |
| 12 | 《题盒》契约、映射、健康与受控降级 | 真实外部阻塞 | `server/src/integrations/quiz-box/`、`docs/mapping/quiz-box-integration.md`；缺真实端点/凭据 |
| 13 | 数据看板与统计快照 | 实现 | `DailyUserStatistic`、`DailyContentStatistic`、Dashboard API |
| 14 | 本地/MinIO/S3 存储抽象与上传安全 | 实现 | `server/src/modules/storage/` |
| 15 | 校验、统一异常/响应、请求 ID、OpenAPI、幂等与日志 | 实现 | `server/src/common/`、`server/src/main.ts`、`IdempotencyKey` |
| 16 | 哈希密码、RBAC、CORS、上传限制、路径安全、脱敏、答案保护 | 实现 | `auth/`、`storage/`、`main.ts`、测评公开接口与测试 |
| 17 | 管理端组件复用 | 实现 | `admin-web/src/components/Admin*.vue` |
| 18 | 冻结设计视觉、响应式、状态与交互反馈 | 实现 | `admin-web/src/styles.css`、管理端组件；真实浏览器证据保留在项目外 |
| 19 | 现有 Mock 到数据库 Seed，保留 slug 和内容/行为边界 | 实现 | `server/prisma/seed.ts`、`docs/mapping/mock-to-database.md` |
| 20 | 数据库、JWT、CORS、存储、SMTP、题盒环境变量示例 | 实现 | `server/.env.example`；示例无真实密钥 |
| 21 | 建议开发顺序 | 不适用 | 属于实施顺序建议，不构成运行时交付物 |
| 22 | 禁止伪联通、答案泄露、任意执行、无必要基础设施 | 实现 | 安全边界见 `docs/architecture.md` 与集成适配代码 |
| 23 | 架构、数据库、API、映射与部署文档 | 实现 | `docs/` |
| 23-BOARD | 仓内任务看板文件 | 不适用 | 项目规则指定外挂看板为权威，禁止创建竞争看板 |
| 24 | 本地门禁、Git 增量提交、本地 Docker验收 | 实现 | 自动化测试与项目外验收证据；本地 Docker不代表生产就绪 |
| IMG2 | 重新生成后台设计图片 | 不适用 | 9 张冻结设计稿已提供且只读，本次直接用于高保真验收 |

真实微信和《题盒》联通需由部署方提供对应外部配置后，在 Staging 重新执行契约测试；在此之前不得宣称外部联通成功。
