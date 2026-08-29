# 《题盒》集成

## 边界

学生网页不复制《题盒》答题引擎。`frontend/src/services/quizBridge.ts` 是统一入口，API 模式使用平台题库/提交接口；外部《题盒》通过服务端适配层接入。

```text
学生端 quizBridge
  → 平台测评 API
  → QuizBoxPort
  → QuizBoxAdapter
  → 外部《题盒》服务
```

适配层位于 `server/src/integrations/quiz-box/`：

- `quiz-box.interface.ts`：平台端口。
- `quiz-box.adapter.ts`：HTTP 客户端与超时。
- `quiz-box.mapper.ts`：外部成绩映射。
- `quiz-box.service.ts`：同步边界与任务记录。

`external_mappings` 保存平台与题盒的用户、题目及试卷标识；`sync_jobs` 保存同步状态。未配置 `QUIZ_BOX_*` 时接口明确返回服务不可用，不伪造外部联通，也不阻塞课程、实训和资源模块。

客户端密钥只从运行环境读取，请求日志不得记录密钥、完整 Token、答案或微信敏感字段。
