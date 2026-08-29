# Mock 数据迁移

`server/prisma/seed.ts` 依据 `frontend/src/data/mock.ts` 建立首批内容，保留现有路由标识。

| Mock | 数据表 | 保留标识 |
| --- | --- | --- |
| `courses` | `courses`、课程版本/章节/课时/内容块 | `llm-zero`、`agent-first`、`image-create`、`api-deploy` 等 |
| `labs` | `labs`、`lab_versions`、`lab_steps` | `agent-workbench`、`model-service`、`linux-command`、`hardware` 等 |
| `resources` | `resources` | `resource-1` 等 |
| `articles` | `articles` | `agent-tools`、`moe` 等 |
| 挑战与成就 | `challenges`、`question_banks`、`questions`、`knowledge_points`、成长表 | `weekly-ai` |
| 用户资料 | `users`、`growth_points` | 环境初始化账号 |

内容数据作为初始发布基线；学习人数、下载量等 Mock 数字不进入 API 模式。正式统计由活动事件、学习记录、实训和测评行为聚合生成。

学生端切换：

```bash
VITE_DATA_MODE=mock npm run dev
VITE_DATA_MODE=api VITE_API_BASE_URL=/api/v1 npm run dev
```

`api` 模式由领域 Store 按查询条件和页码读取，并按查询键缓存当前分页；详情使用独立接口，不依赖已加载列表。单页失败不会阻断会话恢复，也不会使用 `mock.ts` 兜底。
