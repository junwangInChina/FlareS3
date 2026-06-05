# Cloudflare 页面请求慢排查

## Goal

定位当前项目部署到 Cloudflare 后页面请求耗时数秒的潜在代码与配置原因，并提出可落地的优化方案。

## What I already know

* 用户反馈：部署到 Cloudflare 后，页面请求非常慢，达到好几秒。
* 当前请求是一次性能审计与方案输出，暂不要求直接改代码。
* 需要阅读项目代码、Cloudflare 相关配置、前端请求路径与 Worker 后端入口。

## Assumptions (temporary)

* “页面请求慢”可能包括首屏 HTML/静态资源加载慢、前端 API 请求慢、Worker 后端处理慢、数据库/R2/外部服务慢或冷启动慢。
* 本轮先基于代码与配置排查高概率原因；如需要真实线上时间分解，再补充观测方案。

## Open Questions

* 是否需要下一阶段直接实现优化，待审计结论后确认。

## Requirements (evolving)

* 梳理 Cloudflare 部署链路、前端页面请求入口、Worker API 路由和关键慢路径。
* 找出代码中可能导致数秒级延迟的高概率原因。
* 给出按影响和改动成本排序的解决方案。
* 标明哪些结论是代码证据支持，哪些需要线上观测进一步验证。

## Acceptance Criteria (evolving)

* [ ] 给出慢请求可能原因清单，并附代码/配置位置。
* [ ] 给出优先级排序的解决方案。
* [ ] 区分可立即修改项与需要观测验证项。

## Definition of Done

* 代码与配置已审阅到足以支撑结论。
* 结论记录在本任务中，并在聊天中给出简明报告。
* 若进入实施阶段，再补充 lint/typecheck/test 要求。

## Out of Scope

* 本轮默认不直接修改生产逻辑。
* 不直接调用生产环境 API 或读取敏感线上数据。

## Technical Notes

* Worker 入口：`worker/src/index.ts`。后端路径会串行执行 `rateLimitMiddleware`、`bootstrapAdmin`、`authSessionMiddleware`，再进入路由。
* 前端路由守卫：`frontend/src/router/index.js`。受保护页面会先等待 `authStore.checkAuth()`，再挂载页面并发起页面数据请求。
* 认证中间件：`worker/src/middleware/authSession.ts`。每个带 session 的 API 请求会先查 `sessions` 再查 `users`。
* 限流中间件：`worker/src/middleware/rateLimit.ts`。每个后端 API 请求都会对 D1 执行阻塞式读写。
* Dashboard API：`worker/src/services/adminOverview.ts`。单次请求包含多次顺序 D1 聚合。
* Files API：`worker/src/routes/files.ts`。列表先 `COUNT` 再分页查询；公开直链文件会逐条解析 R2 配置并生成签名 URL。
* Shares API：`worker/src/services/shares.ts`。当前先全量读取三类分享，再在 Worker 内过滤、排序、分页。
* Mount 页面：`frontend/src/views/Mount.vue`。初始化可能触发重复 `loadObjects()`，对 WebDAV/Koofr 等外部存储会放大延迟。
* Storage Config API：`worker/src/routes/storageConfigs.ts`。返回配置时会解密并返回密钥字段，既重又有安全风险。

## Research References

* [`research/cloudflare-performance-notes.md`](research/cloudflare-performance-notes.md) — Cloudflare Workers/D1 性能建议与本项目映射。

## Audit Findings

* 高概率主因 1：每个 API 请求都有 D1 限流读写 + session 两次查询 + 业务查询，首屏多 API 时延迟叠加。
* 高概率主因 2：前端路由守卫把 `checkAuth` 放在页面数据请求之前，形成首屏串行等待。
* 高概率主因 3：Dashboard 和 storage config 等接口存在大量顺序 D1 查询。
* 高概率主因 4：Shares 列表全量读取三张分享表后在 Worker 内过滤/排序/分页，数据量增长后会明显变慢。
* 高概率主因 5：Mount 初始化重复拉对象列表；外部 WebDAV/Koofr 请求会被重复触发。
* 中概率主因：Worker 使用 `nodejs_compat` 和 AWS SDK S3 依赖，可能增加冷启动/包体成本；需要线上指标验证。

## Second-Pass Coverage Notes

* 二次审计枚举并扫描了 `frontend/src`、`worker/src`、`worker/migrations`、`.github/workflows`、`README.md`、`docs` 下与请求/部署相关的文件。
* 补扫模式包括：前端 `onMounted` / `watch` / `api.*` / `fetch`，Worker `env.DB.prepare` / `.all` / `.first` / `.run` / `db.batch` / `fetch` / `getSignedUrl` / `bcrypt` / `crypto.subtle`，部署 `wrangler` / `assets` / `nodejs_compat`。
* 代码证据可以确认：存在固定前置 D1 成本、首屏串行认证、Dashboard 顺序聚合、Shares 全量内存分页、Mount 重复对象列表请求、配置接口重复解密。
* 代码证据不能单独确认：线上“好几秒”的唯一根因、各环节实际耗时占比、是否有 Cloudflare 冷启动/区域/D1 位置/外部存储网络因素。需要线上分段计时或 Cloudflare Analytics/Logs 验证。
