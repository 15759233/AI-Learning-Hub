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
| GET | `/auth/registration-config` | 开放／邀请／关闭模式及邮件能力，不返回密钥 |
| POST | `/auth/register` | 邮箱规范化；同事务创建学生、社区资料、协议、注册事件和会话 |
| POST | `/auth/password/forgot`、`/auth/password/reset` | 通用找回提示；30分钟、一次性哈希令牌；重置后撤销刷新会话 |
| POST | `/auth/email/verify` | 验证注册邮箱；启用验证的账号验证后才能进入社区 |

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

## 学习社区

`GET /community/bindings/context?type=course&id=<id或slug>` 复用内容解析服务返回可见的关联卡片和建议话题；私人实训记录仍验证本人所有权。发布器的内容查找复用既有各领域公开列表，不创建平行内容源。

所有 `/community` 接口均要求有效登录。跨校内容、隐藏/屏蔽内容及非本人草稿统一按不可见处理。

| 能力 | 路径 |
| --- | --- |
| 三类信息流 | `GET /community/feed?mode=for_you|following|latest&type=all&cursor=…&limit=20` |
| 学习上下文与新内容提示 | `GET /community/context`、`GET /community/feed/updates?since=…&mode=…&type=…` |
| 动态与评论 | `/community/posts`、`/community/posts/:id`、`/community/posts/:id/comments`、`/community/comments/:id` |
| 回答采纳 | `POST /community/questions/:postId/accept/:commentId` |
| 幂等互动 | `PUT/DELETE /community/posts/:id/reactions/:type`、`/community/posts/:id/bookmark`、`/community/comments/:id/like` |
| 用户与话题 | `/community/users/:id`、`/community/users/:id/posts|answers|following`、`/community/topics`、`/community/topics/:slug/posts` |
| 幂等关注 | `PUT/DELETE /community/users/:id/follow`、`/community/topics/:id/follow` |
| 负反馈 | `POST /community/posts/:id/hide|not-interested|report`、`/community/users/:id/mute|block`、`/community/comments/:id/report` |
| 通知 | `GET /community/notifications`、`/community/notifications/unread-count`，`POST /community/notifications/:id/read`、`/community/notifications/read-all` |
| 行为 | `POST /community/signals`、`/community/feed/impressions`、`/community/feed/dwell`，曝光和停留支持批量提交 |
| 文件 | `POST /community/media`、`GET /community/media/:id/url`，最多四张、每张 5MB 的 PNG/JPEG/WebP |
| 引导与用户名 | `POST /community/onboarding`、`GET /community/onboarding/schools`、`PATCH /community/profile/username`（只能修改一次） |
| 草稿 | `GET/POST /community/drafts`、`PATCH/DELETE /community/drafts/:id`；复用动态模型且仅本人可见 |
| 搜索 | `GET /community/search?q=…&type=all|posts|users|topics|courses|labs|resources|articles&cursor=…` |

用户公开路由使用 `/community/user/:username`，资料入口为 `GET /community/users/by-username/:username`；关注等受保护写操作使用明确的内部用户 ID。快捷发布和高级编辑共用内容块、图片上传、学习关联及发布接口；每分钟最多新发布5条，草稿保存不计入，发布草稿不能绕过限制。

运营入口 `/admin/community` 使用独立 `community.read/write/moderate/topic.manage/report.manage/official.publish/feed.manage` 权限。官方账号发布、内容编辑、审核、认证和策略调整均记录理由。策略只接受命名参数及安全数值范围，禁止任意代码或公式。

## 管理端

- 组织与用户：`/admin/schools`、`/admin/departments`、`/admin/users`、`/admin/users/:id/identities`
- 内容：`/admin/themes|courses|labs|resources|articles|challenges`
- 内容结构：主题路径；课程章节、课时、内容块、关联与排序；实训五类配置、步骤、工具、资源和报告；文章推荐位；题库和试卷均有专用子资源接口
- 操作：内容发布、撤回、归档与排序；课程、实训、文章和题目发布原子切换快照指针
- 首页：`GET/PATCH /admin/homepage/modules`、推荐项选择与排序、`POST /admin/homepage/publish`
- 数据：`GET /admin/dashboard`、用户成长、排行榜快照、内容统计
- 文件：`POST /admin/files/upload`；类型、大小、路径和可见性由服务端校验
- 设置：`GET/PATCH /admin/settings`，支持字符串、数字、布尔和字符串数组；通知发布、登录/操作/审计日志查询
- 注册：`GET/PATCH /admin/registration/settings`（`settings.read/write`）；禁止通过通用设置绕过注册校验
- 学生账号：`PATCH /admin/users/:id/status`、`POST /admin/users/:id/reset-onboarding`（`growth.write`），不允许借此修改管理员；禁用后现有会话立即失效
- 题盒：`GET /admin/integrations/quiz-box/health`

管理端接口要求 Bearer Token，并按领域校验 `read / write / publish` 权限；未认证返回 401，权限不足返回 403。OpenAPI 页面为 `/api/docs`，机器文档为 `/api/docs-json`。
