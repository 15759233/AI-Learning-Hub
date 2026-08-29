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

> 默认只监听 `127.0.0.1`。不要将此 Compose 直接暴露公网；正式部署请使用[服务部署方案](service-deployment.md)。
