# API 模块

基础路径为 `/api/v1`。成功响应统一为：

```json
{ "code": 0, "message": "success", "data": {}, "requestId": "req_xxx" }
```

## 认证

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/auth/login` | 返回短时 Access Token，并写入 HttpOnly Refresh Cookie |
| POST | `/auth/refresh` | 轮换并撤销旧 Refresh Token |
| POST | `/auth/logout` | 撤销 Refresh Token |
| POST | `/auth/wechat/miniapp` | 微信 `code` 换取身份；未配置时返回 503 |
| POST | `/auth/identities/wechat/bind` | 当前用户绑定微信身份 |
| GET/PATCH | `/me` | 当前用户资料 |

## 公开内容

`GET /public/homepage`、`/themes`、`/courses`、`/labs`、`/resources`、`/articles`、`/challenges` 及各自 `/:slug`。公开接口只返回已发布记录，题目接口不返回标准答案。

## 学习行为

| 模块 | 路径 |
| --- | --- |
| 课程 | `GET /me/courses`、`POST /courses/:id/enroll`、`PUT /courses/:id/progress`、`PUT /courses/:id/note` |
| 实训 | `POST /labs/:id/runs`、`POST /lab-runs/:id/actions`、`GET /lab-runs/:id/events`、`POST /lab-runs/:id/submit` |
| 收藏 | `POST /favorites`、`DELETE /favorites/:type/:id`、`GET /me/favorites` |
| 成长 | `GET /me/growth`、`GET/POST /me/learning-plans`、`PATCH /me/learning-plans/:id` |
| 测评 | `GET /challenges/:slug/questions`、`POST /challenges/:slug/submit` |
| 通知 | `GET /me/notifications`、`POST /me/notifications/:id/read` |

测评提交必须携带 `Idempotency-Key`。实训 SSE 只推送受控状态与日志。

## 管理端

- 组织与用户：`/admin/schools`、`/admin/departments`、`/admin/users`、`/admin/users/:id/identities`
- 内容：`/admin/themes|courses|labs|resources|articles|challenges`
- 内容结构：主题路径、课程章节/课时/内容块、实训步骤/工具/报告、文章推荐位、题库/试卷/规则均有专用子资源接口
- 操作：内容发布、撤回、归档与排序；课程、实训、文章和题目发布原子切换快照指针
- 首页：`GET/PATCH /admin/homepage/modules`、推荐项管理、`POST /admin/homepage/publish`
- 数据：`GET /admin/dashboard`、用户成长、排行榜快照、内容统计
- 文件：`POST /admin/files/upload`；类型、大小、路径和可见性由服务端校验
- 设置：`GET/PATCH /admin/settings`、通知发布、登录/操作/审计日志查询
- 题盒：`GET /admin/integrations/quiz-box/health`

管理端接口要求 Bearer Token 和 `admin` 角色；未认证返回 401，权限不足返回 403。OpenAPI 页面为 `/api/docs`，机器文档为 `/api/docs-json`。
