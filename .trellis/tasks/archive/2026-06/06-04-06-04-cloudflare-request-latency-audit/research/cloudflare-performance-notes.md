# Cloudflare Performance Notes

## Sources Checked

* Context7 Cloudflare Workers docs: Cache API examples, Static Assets binding, `ctx.waitUntil`.
* Context7 Cloudflare D1 docs: prepared statements, batch, index guidance, query performance notes.

## Relevant Guidance

* Static assets should be served via an `ASSETS` binding when using a Worker as the full-stack entry.
* Cacheable GET responses can use the Workers Cache API; cache writes should use `ctx.waitUntil()` so the response is not blocked by cache population.
* Non-critical background work such as logging/audit/cache population should be moved behind `ctx.waitUntil()` when correctness allows.
* D1 read queries are expected to be fast when backed by suitable indexes; large scans, unbounded reads, and write-heavy per-request middleware are common latency risks.
* D1 supports `db.batch()` for grouping multiple statements when the route genuinely needs several independent queries.

## Mapping To This Repo

* The full-stack Worker config has an `ASSETS` binding, so static asset serving is structurally correct in `worker/wrangler.full.toml`.
* Every backend API request currently does at least rate-limit D1 work, then session D1 work, before the route handler.
* Dashboard, storage config, share listing, and file listing contain multiple sequential or full-table D1 operations that can be optimized or cached.
* Several frontend views perform duplicate or serial initial requests after route auth validation.
