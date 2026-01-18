# FlareS3

基于 Cloudflare Pages + Workers + D1 + R2 的多用户版本，保留原有上传/分片/短链能力，并新增用户管理、配额与审计。

## 架构

- 前端：Vue 3 + Vite（Pages）
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
npx wrangler d1 execute DB --local --file=src/db/schema.sql
```

- `DB` 为 `worker/wrangler.toml` 中 `[[d1_databases]]` 的 `binding`。
- 这会把本地数据库写到 `worker/.wrangler/state/v3/d1/`（Miniflare 持久化），不依赖远程 D1。
- 需要重置本地数据可删除该目录或执行 `npx wrangler d1 execute DB --local --command "DELETE FROM users;"` 等。

### 2) 配置环境变量

- 复制 `worker/.dev.vars.example` 为 `worker/.dev.vars`
- 设置以下必需变量（默认使用环境变量配置 R2）：
  - `BOOTSTRAP_ADMIN_USER`
  - `BOOTSTRAP_ADMIN_PASS`
  - `R2_ENDPOINT`
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET`
  - `R2_MASTER_KEY`（32 字节 base64，可用 `openssl rand -base64 32` 生成；需长期保持不变）

> 如需通过 UI 向导配置 R2：不要设置 `R2_ENDPOINT/R2_ACCESS_KEY_ID/R2_SECRET_ACCESS_KEY/R2_BUCKET`，仅保留 `R2_MASTER_KEY`，并在 `/setup` 完成配置。

### 3) 启动服务（分别启动）

```bash
cd "~/flares3/worker"
npm run dev

cd "~/flares3/frontend"
npm run dev
```

> 如需并发启动，可在根目录执行：`npm run dev`（依赖已在子目录安装）。
> 首次请求若用户表为空，会用 `BOOTSTRAP_ADMIN_USER/PASS` 自动创建管理员。

## 质量检查（可选）

在根目录执行（不需要在根目录安装依赖；会调用子目录脚本）：

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

## 部署到 Cloudflare

### 手动部署

1. 创建/绑定 D1 与 R2（并在 `worker/wrangler.toml` 填写实际 `database_id`）
2. 设置 Secrets（见 `worker/.dev.vars.example`）
3. 部署 Worker（`wrangler deploy`）
4. Pages 绑定路由：`/api/*`、`/s/*`、`/f/*`、`/t/*`

### 自动化部署（可选）

仓库内置基础 CI（见 `.github/workflows/ci.yml`）：分别在 `worker/` 与 `frontend/` 安装依赖并执行 `lint/typecheck/build`。

如需 CD（由 GitHub Actions 统一发布 Pages + Worker），使用 `.github/workflows/deploy.yml`。

#### 0) Cloudflare 侧准备（一次性）

1. 创建 D1 数据库
   - 默认使用 `database_name = "flares3-r2"`（见 `worker/wrangler.toml`，可改但需保持一致）
   - 将 D1 的 `database_id` 写入 `worker/wrangler.toml`（替换 `REPLACE_WITH_D1_ID`；可在 Cloudflare Dashboard -> D1 -> 对应数据库详情页查看）
2. 创建 Pages 项目（Direct Upload / CLI）
   - 项目名用于 GitHub Variable：`CLOUDFLARE_PAGES_PROJECT_NAME`
3. 配置 Worker 运行时变量 / Secrets（生产环境）
   - 位置：Cloudflare Dashboard -> Workers & Pages -> Workers -> `flares3` -> Settings/Variables
   - Secrets（至少需要）：
     - `BOOTSTRAP_ADMIN_USER`
     - `BOOTSTRAP_ADMIN_PASS`
     - `R2_MASTER_KEY`（32 字节 base64；需要长期保持不变）
   - R2 配置方式二选一：
     - 环境变量直配（推荐自动化）：额外设置 `R2_ENDPOINT`、`R2_ACCESS_KEY_ID`、`R2_SECRET_ACCESS_KEY`、`R2_BUCKET`
     - UI 向导配置：不设置上述 `R2_*`（保留 `R2_MASTER_KEY`），部署后访问 `/setup` 配置
   - 非敏感配置（可在 `worker/wrangler.toml` 的 `[vars]` 调整）：`MAX_FILE_SIZE`、`TOTAL_STORAGE`

#### 1) GitHub 仓库配置（一次性）

位置：GitHub 仓库 -> Settings -> Secrets and variables -> Actions

- Secrets：
  - `CLOUDFLARE_API_TOKEN`（API Token 权限至少包含：Workers 部署、Pages 部署、D1 执行）
  - `CLOUDFLARE_ACCOUNT_ID`
- Variables：
  - `CLOUDFLARE_PAGES_PROJECT_NAME`

> 获取方式：`CLOUDFLARE_API_TOKEN` 在 Cloudflare Dashboard -> My Profile -> API Tokens 创建；`CLOUDFLARE_ACCOUNT_ID` 可在 Cloudflare Dashboard 任意页面的 Account 信息处查看。

#### 2) 触发部署

- 推送到 `main` 分支会自动触发 `Deploy` 工作流
- 或在 GitHub Actions 页面手动触发（`workflow_dispatch`）

#### 3) 部署流程做了什么

`deploy.yml` 会依次执行：

1. 安装依赖（`worker/`、`frontend/`）
2. `npm run lint` / `npm run typecheck` / `npm run build`
3. 执行 D1 幂等初始化：`wrangler d1 execute DB --remote --file=src/db/schema.sql --yes`
4. 部署 Worker：`wrangler deploy`
5. 部署 Pages：`wrangler pages deploy ../frontend/dist --project-name=$CLOUDFLARE_PAGES_PROJECT_NAME --branch=$GITHUB_REF_NAME`（工作流仅在 `main` 运行）

### 部署后操作

- 在 Cloudflare Dashboard 绑定 Worker 路由：
  - `/api/*` -> Worker
  - `/s/*` -> Worker
  - `/f/*` -> Worker
  - `/t/*` -> Worker
- 打开 Pages URL 并用 bootstrap 管理员登录；如未配置 `R2_*`，在 `/setup` 完成 R2 配置

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

## 说明

- 管理员账号通过 `BOOTSTRAP_ADMIN_USER/PASS` 初始化，仅在 `users` 为空时执行。
- 上传时可配置下载是否需要登录。
- 删除用户将触发文件批处理清理（Cron）。
