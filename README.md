# FlareS3

基于 Cloudflare Pages + Workers + D1 + R2 的多用户版本，保留原有上传/分片/短链能力，并新增用户管理、配额与审计。

## 架构

- 前端：Vue 3 + Naive UI（Pages）
- 后端：Cloudflare Workers（同域 `/api` 与 `/s`）
- 数据库：D1
- 存储：R2（S3 兼容）

## 目录结构

```
./flares3
├── frontend
└── worker
```

## 本地开发

### 0) 安装依赖（分别在子目录）

```bash
cd "~/flares3/worker"
npm install

cd "~/flares3/frontend"
npm install
```

### 1) 初始化 D1（本地模拟）

```
cd worker
npx wrangler d1 execute flares3-r2 --local --file=src/db/schema.sql
```

- 这会把本地数据库写到 `worker/.wrangler/state/v3/d1/`（Miniflare 持久化），不依赖远程 D1。
- 需要重置本地数据可删除该目录或执行 `npx wrangler d1 execute flares3-r2 --local --command "DELETE FROM users;"` 等。

### 2) 配置环境变量

- 复制 `worker/.dev.vars.example` 为 `worker/.dev.vars`
- 设置以下必需变量：
  - `BOOTSTRAP_ADMIN_USER`
  - `BOOTSTRAP_ADMIN_PASS`
  - `R2_ENDPOINT`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_MASTER_KEY`（32 字节 base64，可用 `openssl rand -base64 32` 生成；需长期保持不变）

### 3) 启动服务（分别启动）

```bash
cd "~/flares3/worker"
npm run dev

cd "~/flares3/frontend"
npm run dev
```

> 如需并发启动，可在根目录执行：`npm run dev`（依赖已在子目录安装）。
> 首次请求若用户表为空，会用 `BOOTSTRAP_ADMIN_USER/PASS` 自动创建管理员。

## 部署到 Cloudflare

### 手动部署

1. 绑定 D1 与 R2
2. 设置 Secrets（见 `worker/.dev.vars.example`）
3. 部署 Worker（`wrangler deploy`）
4. Pages 绑定路由：`/api/*`、`/s/*`

### 一键部署（脚本）

```bash
cd "~/flares3"
chmod +x "scripts/deploy_cf.sh"
./scripts/deploy_cf.sh
```

脚本会执行：

1. 创建 D1
2. 应用数据库结构
3. 设置 Worker Secrets
4. 部署 Worker
5. 构建前端
6. 部署 Pages
7. 确认 CORS 配置（直传依赖）

### 脚本输入（环境变量）

必需（始终）：

- `BOOTSTRAP_ADMIN_USER`
- `BOOTSTRAP_ADMIN_PASS`
- `R2_MASTER_KEY`（32 字节 base64，可用 `openssl rand -base64 32` 生成；需长期保持不变）

使用环境变量配置 R2（默认）：

- `R2_ENDPOINT`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- `R2_BUCKET`

使用 UI 向导配置 R2：

- 设置 `USE_DB_CONFIG=1`，并跳过 `R2_*` 变量

可选：

- `D1_NAME`（默认：`flares3`）
- `D1_DATABASE_ID`（跳过 D1 创建）
- `PAGES_PROJECT_NAME`（默认：`flares3`）
- `R2_CORS_CONFIRMED=1`（跳过 CORS 确认）

示例（无交互）：

```bash
export BOOTSTRAP_ADMIN_USER="admin"
export BOOTSTRAP_ADMIN_PASS="change_me"
export R2_MASTER_KEY="base64-32-bytes" # 生成一次并保存，修改会导致已保存配置无法解密
export R2_ENDPOINT="https://<account_id>.r2.cloudflarestorage.com"
export R2_ACCESS_KEY_ID="xxxx"
export R2_SECRET_ACCESS_KEY="yyyy"
export R2_BUCKET="flares3"
export PAGES_PROJECT_NAME="flares3"

./scripts/deploy_cf.sh
```

### 部署后操作

- 在 Cloudflare Dashboard 绑定 Worker 路由：
  - `/api/*` -> Worker
  - `/s/*` -> Worker
- 打开 Pages URL 并用 bootstrap 管理员登录；若 `USE_DB_CONFIG=1`，在 `/setup` 完成 R2 配置

### R2 CORS（必须）

前端直传依赖 R2 CORS 配置，否则上传会失败。生产环境请将 `AllowedOrigins` 收敛为你的实际域名。

示例配置：

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:18786",
      "http://127.0.0.1:18786",
      "http://localhost:18787",
      "http://127.0.0.1:18787",
      "https://*.pages.dev"
    ],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

## CI 部署

非交互式脚本：`scripts/deploy_cf_ci.sh`（需预置所有环境变量）。
若不想交互式确认 CORS，请设置 `R2_CORS_CONFIRMED=1`。

```bash
cd "~/sflares3"
chmod +x "scripts/deploy_cf_ci.sh"
./scripts/deploy_cf_ci.sh
```

### 备注

- 脚本依赖 `wrangler` 与 `npm` 在 PATH。
- 若已创建 D1，可设置 `D1_DATABASE_ID` 跳过 `wrangler d1 create`。

## 说明

- 管理员账号通过 `BOOTSTRAP_ADMIN_USER/PASS` 初始化，仅在 `users` 为空时执行。
- 上传时可配置下载是否需要登录。
- 删除用户将触发文件批处理清理（Cron）。
