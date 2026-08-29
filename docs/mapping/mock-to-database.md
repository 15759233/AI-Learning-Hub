# Mock 数据迁移

`server/prisma/seed.ts` 依据 `frontend/src/data/mock.ts` 建立首批内容，保留现有路由标识。

| Mock | 数据表 | 保留标识 |
| --- | --- | --- |
| `courses` | `courses`、课程版本/章节/课时/内容块 | `llm-zero`、`agent-first`、`image-create`、`api-deploy` 等 |
| `labs` | `labs`、`lab_steps` | `agent-workbench`、`model-service`、`linux-command`、`hardware` 等 |
| `resources` | `resources` | `resource-1` 等 |
| `articles` | `articles` | `agent-tools`、`moe` 等 |
| 挑战与成就 | `challenges`、`question_banks`、`questions`、成长表 | `weekly-ai` |
| 用户资料 | `users`、`growth_points` | 环境初始化账号 |

内容数据作为初始发布基线；学习人数、下载量等 Mock 数字只作为展示元数据，不写入正式统计事件。正式统计由 `activity_events`、学习记录、实训和测评行为生成。

学生端切换：

```bash
VITE_DATA_MODE=mock npm run dev
VITE_DATA_MODE=api VITE_API_BASE_URL=/api/v1 npm run dev
```

`api` 模式在启动时并行读取公开内容；任何请求失败都会进入错误状态，不使用 `mock.ts` 兜底。
