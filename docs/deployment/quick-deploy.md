# Docker Compose 快速部署

适用于本机快速体验，自动构建学生端、管理端、API 和 PostgreSQL。

## 启动

```bash
cp deploy/compose/.env.example deploy/compose/.env
# 修改 .env 中所有 change-me 值
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml up -d --build
```

默认入口：

- 学生端：`http://127.0.0.1:8080`
- 管理端：`http://127.0.0.1:8081`
- OpenAPI：`http://127.0.0.1:8080/api/docs`

检查与停止：

```bash
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml ps
docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml down
```

数据和上传文件保存在 Docker 命名卷中，`.env` 不进入 Git。

## 注册与邮件

默认开放学生邮箱注册。启动依次执行 `migrate`、`bootstrap`、API，不重播演示 Seed。`bootstrap` 只补必要角色、权限、设置和首个管理员；`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` 不覆盖已有账号。首次开放注册前，管理员须创建并发布至少三个学习方向，供首次引导选择；注册设置在「系统设置」维护。

如需演示内容，仅在独立体验库显式执行：

```bash
LOAD_DEMO_DATA=true docker compose --env-file deploy/compose/.env \
  -f deploy/compose/docker-compose.yml --profile demo run --rm seed-demo
```

演示 Seed 还需配置 `.env` 中的学生样例凭据。正常启动保留 `LOAD_DEMO_DATA=false`，不得对真实业务库重播演示数据。

邮箱验证与找回密码需配置 `SMTP_HOST`、`SMTP_PORT`、`SMTP_FROM`、`FRONTEND_URL`，认证邮件服务另填 `SMTP_USER`、`SMTP_PASSWORD`。默认强制 TLS；`SMTP_ALLOW_INSECURE=true` 仅用于隔离邮件验收。注册邮件失败不会撤销已创建账号，可通过 `/auth/email/resend` 重发。找回邮件异步发送，发送期间进程重启需重新申请；不宣称邮件已送达。

邀请注册需在环境变量 `REGISTRATION_INVITE_HASHES` 填入邀请码的 SHA-256 十六进制摘要（逗号分隔）；不在数据库或公开设置保存明文邀请码。当前为可重复使用的邀请码，不包含配额管理。

API 默认不信任转发头。Compose 仅允许 Docker 私网代理范围，Nginx 覆盖 `X-Forwarded-For`；调整网络时将 `TRUSTED_PROXY_CIDRS` 收窄为实际代理网段，勿对外开放 API 容器或信任任意来源。

> 默认只监听 `127.0.0.1`。不要将此 Compose 直接暴露公网；正式部署请使用[服务部署方案](service-deployment.md)。
