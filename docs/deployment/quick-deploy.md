# 本地 Docker开发测试

本地 Docker 是本项目的局域网开发验收环境，不等同于正式服务部署。

## 入口与拓扑

```text
:8088 学生端 ─┐
:8089 管理端 ─┼─ /api → NestJS:3000 → PostgreSQL:5432
              └─ 本地上传持久卷
```

Compose 文件位于 `deploy/compose/docker-compose.yml`，包含 PostgreSQL、一次性迁移/Seed、NestJS、学生端 Nginx 和管理端 Nginx。PostgreSQL 与上传目录使用命名卷。

## 首次部署

1. 从已验证 Git SHA 构建 `linux/amd64` 三个镜像并加载到 NAS。
2. 在项目专用目录复制 Compose，创建权限受限的 `.env`。
3. `.env` 设置同一 SHA 的 `SERVER_IMAGE`、`STUDENT_IMAGE`、`ADMIN_IMAGE` 和 `APP_COMMIT_SHA`。
4. 运行：

```bash
docker compose config
docker compose up -d postgres
docker compose run --rm migrate
docker compose up -d server student-web admin-web
docker compose ps
```

`.env` 不进入 Git。迁移/Seed 成功后才启动 API。

Nginx 将学生端和管理端的 `/api/` 代理到 `server:3000`；静态站深层路由回退 `index.html`。容器固定基础镜像版本与摘要，应用镜像使用已验证 Git SHA 标签，所有服务配置 `restart` 与健康检查。

## 增量发布与回滚

- 每个 Git SHA 使用新镜像标签，禁止覆盖旧标签。
- 增量发布先加载新镜像，再更新 `.env` 的三个镜像标签并执行 `docker compose up -d`。
- 保留上一 SHA 的 `.env` 快照和镜像；回滚时恢复上一组标签并重新 `up -d`。
- 数据库变更采用向前修复；回滚前确认新迁移是否与旧应用兼容。

## 验收

- `docker compose config` 成功，容器 healthy、重启次数为 0。
- `/healthz`、`/api/v1/health`、`/api/docs` 与深层 SPA 路由返回成功。
- 管理发布后学生端可见；学生收藏、实训和测评后管理端可查。
- PostgreSQL 容器重启后数据仍存在。
- `index.html` 为 `no-store`，哈希资源为 `immutable`。
- 日志无凭据、Token、题目答案和关键错误。
- `.env`、数据库口令、JWT、外部适配密钥和上传文件只保留在 NAS 项目专用目录或命名卷，不进入源码归档与 Git。

结论只能表述为“本地 Docker开发测试通过”。
