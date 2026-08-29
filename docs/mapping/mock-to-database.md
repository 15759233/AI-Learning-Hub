# Mock 数据迁移

`packages/demo-fixtures/` 是演示内容的唯一语义来源。Prisma Seed 与学生端 Mock Repository 读取同一数据集；API 模式继续读取 PostgreSQL，失败不回退 Mock。

| Mock | 数据表 | 保留标识 |
| --- | --- | --- |
| `demoCourses` | `courses`、课程版本/章节/课时/内容块 | `llm-zero`、`agent-first`、`docker-models` 等 |
| `demoLabs` | `labs`、`lab_versions`、`lab_steps` | `model-service`、`campus-agent`、`linux-command` 等 |
| `demoResources` | `resources` | `llm-handbook`、`docker-guide` 等 |
| `demoArticles` | `articles` | `agent-tools`、`moe` 等 |
| `demoChallenges` | `challenges`、题库、题目、知识点 | `weekly-ai` 等 |
| 学生与成长数据 | 用户、计划、积分、徽章、证书、动态、日统计 | 稳定演示标识 |

Seed 可重复执行并更新固定演示记录，不制造重复数据；首页只保留 12 个正式模块，排序归一化为 `0～11`，完成推荐关系后自动生成首次发布快照。学习人数、下载量等初始化指标用于演示基线，后续真实行为继续由活动、学习、实训和测评记录聚合。

学生端切换：

```bash
VITE_DATA_MODE=mock npm run dev
VITE_DATA_MODE=api VITE_API_BASE_URL=/api/v1 npm run dev
```

`api` 模式由领域 Store 按查询条件和页码读取，并按查询键缓存当前分页；详情使用独立接口，不依赖已加载列表。单页失败不会阻断会话恢复，也不会使用 `mock.ts` 兜底。
