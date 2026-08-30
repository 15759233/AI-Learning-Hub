# AI 数智化学习平台

面向高校学生的 AI 学习、受控实训与创客社区平台。学生可围绕课程、知识点、实训项目和学习成果共同提问、分享与讨论，并完成学习、收藏、实训和测评回写；管理后台统一维护内容和社区运营，NestJS 执行业务规则，PostgreSQL 提供统一数据源，《题盒》通过适配层接入统一题库与成绩。

## 架构

```text
学生端 Vue 3 ─┐
管理端 Vue 3 ─┼─ Nginx ─ NestJS /api/v1 ─ Prisma ─ PostgreSQL
《题盒》──────┘                         └─ 本地 / MinIO / S3
```

- `frontend/`：学生端，提供学习、实训、测评与社区讨论，支持 `VITE_DATA_MODE=mock|api`。
- `admin-web/`：管理后台，负责内容编辑、发布、社区运营及业务数据查询。
- `server/`：NestJS 模块化单体、Swagger、RBAC、SSE 与存储适配。
- `packages/contracts/`：跨端状态、分页及 DTO 契约。
- `deploy/compose/`：Docker Compose 快速部署。

## 开发验证

```bash
cd server && npm ci && npm run check
cd admin-web && npm ci && npm run check
cd frontend && npm ci && npm run check
```

数据库迁移、环境变量和部署命令见：

- [Docker Compose 快速部署](docs/deployment/quick-deploy.md)
- [基本架构](docs/architecture.md)
- [服务部署方案](docs/deployment/service-deployment.md)
- [API 模块](docs/api/module-api.md)
- [数据库模型](docs/database/schema.md)
- [需求覆盖矩阵](docs/mapping/requirements-coverage.md)

## 作者

K、Rong、Wen、Xin、Yun、Qiang

## 许可

本项目采用 [MIT License](LICENSE)。
