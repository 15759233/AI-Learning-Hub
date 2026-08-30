# 数据库模型

PostgreSQL 是 API 模式的唯一正式数据源，Prisma 模型位于 `server/prisma/schema.prisma`，不可变迁移位于 `server/prisma/migrations/`。

## 领域表

| 领域 | 核心表 |
| --- | --- |
| 用户、组织与权限 | `users`、`schools`、`departments`、`auth_identities`、`refresh_tokens`、`roles`、`permissions`、`user_roles`、`role_permissions`、`login_logs` |
| 首页运营 | `homepage_modules`、`homepage_module_versions`、`homepage_publications`、`homepage_items` |
| 主题与路径 | `learning_themes`、`learning_theme_versions`、`learning_paths`、`learning_path_stages`、`learning_path_contents` |
| 课程 | `courses`、`course_versions`、`course_instructors`、`course_resources`、`course_labs`、`course_chapters`、`course_lessons`、`lesson_blocks` |
| 学习记录 | `lesson_progress`、`learning_notes`、`favorites`、`learning_plans`、`learning_plan_items` |
| 实训 | `labs`、`lab_versions`、`lab_steps`、`lab_tools`、`lab_tool_bindings`、`lab_resources`、`lab_runs`、`lab_run_snapshots`、`lab_run_events`、`lab_reports` |
| 资源与文件 | `files`、`resources`、`resource_categories`、`resource_versions`、`tags`、`resource_tags`、`resource_views`、`resource_downloads` |
| AI 前沿 | `articles`、`article_versions`、`article_categories`、`article_tags`、`article_views`、`article_publications`、`article_recommendations` |
| 测评与题库 | `question_banks`、`questions`、`question_versions`、`question_options`、`knowledge_points`、`papers`、`paper_questions`、`challenges`、`challenge_rules`、`assessment_attempts`、`assessment_answers`、`wrong_questions`、`user_knowledge_stats`、`ranking_snapshots` |
| 成长与统计 | `growth_points`、`achievements`、`user_achievements`、`certificates`、`user_certificates`、`growth_module_settings`、`activity_events`、`daily_user_statistics`、`daily_content_statistics`、`user_recommendations` |
| 系统与集成 | `notifications`、`notification_reads`、`system_settings`、`audit_logs`、`operation_logs`、`external_mappings`、`sync_jobs`、`idempotency_keys` |
| 社区内容与关系 | `community_profiles`、`community_posts`、`community_post_bindings`、`community_question_states`、`community_comments`、`community_post_reactions`、`community_comment_reactions`、`community_bookmarks`、`community_user_follows`、`community_topics`、`community_post_topics`、`community_topic_follows` |
| 社区治理与推荐 | `community_feedback`、`community_reports`、`community_moderation_actions`、`community_feed_impressions`、`community_feed_sessions`、`user_notifications`、`user_feed_signal_snapshots` |

## 约束

- 路由内容使用稳定 `slug`；现有学生端标识在 seed 中保留。
- 内容采用 `draft / reviewing / published / archived` 状态，公开接口只读取已发布快照。
- 课程、实训、资讯和题目维护 `current_draft_version_id` 与 `published_version_id`；首页使用独立发布快照。撤回只改变公开可见性，不覆盖历史快照。
- 内容表包含排序、版本、发布时间、软删除和更新时间。
- 历史学习、实训和测评记录使用外键保护，不随内容下架删除。
- 测评提交、成长积分和行为事件在一个事务内写入。
- 文件仅保存元数据、摘要和对象键，不保存二进制。
- 社区互动复合唯一键保证重复请求幂等；计数与互动关系在同一事务更新，数据库同时约束非负计数、同校范围及举报单一目标。
- 社区帖子和评论软删除；父评论删除保留回复结构，采纳答案删除后问题恢复未解决。多态内容绑定由统一解析服务验证已发布状态和所有权。

## 迁移与 Seed

```bash
cd server
DATABASE_URL='postgresql://...' npx prisma migrate deploy
SEED_ADMIN_PASSWORD='...' SEED_STUDENT_PASSWORD='...' npm run prisma:seed
```

Seed 与前端 Mock 共用 `packages/demo-fixtures`，保留稳定 slug。首次初始化写入原有领域及 90 条社区内容、180 条评论回复和 24 个话题；已发布平台仅幂等增补社区样例，不覆盖运营数据、账号凭据或历史快照。历史空首页发布只追加最近有效快照，不删除历史。管理员与学生密码必须通过运行环境提供；示例文件不包含真实值。

新增模型时创建新迁移，禁止修改已发布迁移。生产环境先备份，再由一次性迁移任务执行 `prisma migrate deploy`；Seed 仅用于首次初始化或明确的内容基线更新。
