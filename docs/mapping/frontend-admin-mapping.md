# 前后台字段与页面映射

| 管理端 | 学生端 | 数据/API |
| --- | --- | --- |
| 首页运营 | `/` | `homepage_modules`、`GET /public/homepage` |
| 学习主题 | `/topics` | `learning_themes`、`GET /themes` |
| 课程内容 | `/courses/:courseId` | `courses`、课程版本/章节/内容块、`GET /courses/:slug` |
| 实训项目 | `/labs`、`/labs/:labId` | `labs`、步骤与运行记录、SSE |
| 资源中心 | `/resources` | `resources`、`files` |
| AI 前沿 | `/frontier` | `articles` |
| 挑战测评 | `/assessments` | `challenges`、题库、测评提交 |
| 用户成长 | `/profile` | 进度、收藏、计划、积分、实训与测评记录 |

通用映射：

- 前端 `id` 对应稳定 `slug`；数据库主键通过 `databaseId` 仅供管理操作。
- 前端 `description` 对应服务端 `summary`。
- 分类、难度、时长、封面变体等展示字段位于版本化 `payload`。
- 状态值使用英文枚举，中文标签由界面映射。
- 后台编辑保存草稿；发布后公开接口才可读取。
