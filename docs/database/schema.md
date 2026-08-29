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

## 约束

- 路由内容使用稳定 `slug`；现有学生端标识在 seed 中保留。
- 内容采用 `draft / reviewing / published / archived` 状态，公开接口只读取已发布快照。
- 课程、实训、资讯和题目维护 `current_draft_version_id` 与 `published_version_id`；首页使用独立发布快照。撤回只改变公开可见性，不覆盖历史快照。
- 内容表包含排序、版本、发布时间、软删除和更新时间。
- 历史学习、实训和测评记录使用外键保护，不随内容下架删除。
- 测评提交、成长积分和行为事件在一个事务内写入。
- 文件仅保存元数据、摘要和对象键，不保存二进制。

## 迁移与 Seed

```bash
cd server
DATABASE_URL='postgresql://...' npx prisma migrate deploy
SEED_ADMIN_PASSWORD='...' SEED_STUDENT_PASSWORD='...' npm run prisma:seed
```

Seed 从 `frontend/src/data/mock.ts` 的既有内容建立稳定 slug，并幂等写入组织、主题、课程、实训、资源、资讯、挑战、题目、首页模块与基础成长数据。管理员与学生密码必须通过运行环境提供；示例文件不包含真实值。

新增模型时创建新迁移，禁止修改已发布迁移。生产环境先备份，再由一次性迁移任务执行 `prisma migrate deploy`；Seed 仅用于首次初始化或明确的内容基线更新。
