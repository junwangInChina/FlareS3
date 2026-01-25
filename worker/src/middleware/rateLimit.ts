import type { Env } from '../config/env'
import { jsonResponse } from '../utils/response'

const RATE_LIMIT_WINDOW_MS = 60 * 1000
const RATE_LIMIT_MAX = 300
const MAX_FAILED_ATTEMPTS = 10
const BLOCK_DURATION_MS = 5 * 60 * 1000

export function getClientIp(request: Request): string {
  const cfIp = request.headers.get('CF-Connecting-IP')
  if (cfIp) return cfIp
  const forwarded = request.headers.get('X-Forwarded-For')
  if (forwarded) return forwarded.split(',')[0].trim()
  return 'unknown'
}

async function isBlocked(db: D1Database, ip: string): Promise<boolean> {
  const row = await db
    .prepare('SELECT blocked_until FROM rate_limits WHERE ip = ?')
    .bind(ip)
    .first('blocked_until')
  if (!row) return false
  const blockedUntil = new Date(String(row))
  if (Number.isNaN(blockedUntil.getTime())) return false
  if (Date.now() < blockedUntil.getTime()) return true
  await db
    .prepare('UPDATE rate_limits SET blocked_until = NULL, failed_attempts = 0 WHERE ip = ?')
    .bind(ip)
    .run()
  return false
}

async function allowRequest(db: D1Database, ip: string): Promise<boolean> {
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  const nowSeconds = Math.floor(nowMs / 1000)
  const result = await db
    .prepare(
      `INSERT INTO rate_limits (ip, request_count, window_start)
       VALUES (?, 1, ?)
       ON CONFLICT(ip) DO UPDATE SET
         request_count = CASE
           WHEN strftime('%s', window_start) IS NULL THEN 1
           WHEN (? - strftime('%s', window_start)) * 1000 > ? THEN 1
           ELSE request_count + 1
         END,
         window_start = CASE
           WHEN strftime('%s', window_start) IS NULL THEN ?
           WHEN (? - strftime('%s', window_start)) * 1000 > ? THEN ?
           ELSE window_start
         END
       WHERE
         strftime('%s', window_start) IS NULL
         OR (? - strftime('%s', window_start)) * 1000 > ?
         OR request_count < ?`
    )
    .bind(
      ip,
      nowIso,
      nowSeconds,
      RATE_LIMIT_WINDOW_MS,
      nowIso,
      nowSeconds,
      RATE_LIMIT_WINDOW_MS,
      nowIso,
      nowSeconds,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX
    )
    .run()
  const changes = Number((result as any)?.meta?.changes ?? 0)
  return !result.error && Number.isFinite(changes) && changes > 0
}

export async function recordFailedAttempt(env: Env, ip: string): Promise<void> {
  const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS).toISOString()
  await env.DB
    .prepare(
      `INSERT INTO rate_limits (ip, failed_attempts, blocked_until)
       VALUES (?, 1, NULL)
       ON CONFLICT(ip) DO UPDATE SET
         failed_attempts = COALESCE(failed_attempts, 0) + 1,
         blocked_until = CASE
           WHEN COALESCE(failed_attempts, 0) + 1 >= ? THEN ?
           ELSE blocked_until
         END`
    )
    .bind(ip, MAX_FAILED_ATTEMPTS, blockedUntil)
    .run()
}

export async function rateLimitMiddleware(
  request: Request,
  env: Env
): Promise<Response | undefined> {
  try {
    const ip = getClientIp(request)
    if (await isBlocked(env.DB, ip)) {
      return jsonResponse({ error: '请求过于频繁，请稍后再试' }, 429)
    }
    if (!(await allowRequest(env.DB, ip))) {
      return jsonResponse({ error: '请求频率超限' }, 429)
    }
  } catch (error) {
    console.error('[rateLimitMiddleware] failed', error)
    return jsonResponse({ error: '服务异常' }, 500)
  }
}
