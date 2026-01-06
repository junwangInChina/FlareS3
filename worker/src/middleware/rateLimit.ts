import type { Env } from '../config/env'

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
  const row = await db
    .prepare('SELECT request_count, window_start FROM rate_limits WHERE ip = ?')
    .bind(ip)
    .first()
  const now = new Date()
  if (!row) {
    await db
      .prepare('INSERT INTO rate_limits (ip, request_count, window_start) VALUES (?, 1, ?)')
      .bind(ip, now.toISOString())
      .run()
    return true
  }
  const windowStart = new Date(String(row.window_start))
  if (
    Number.isNaN(windowStart.getTime()) ||
    now.getTime() - windowStart.getTime() > RATE_LIMIT_WINDOW_MS
  ) {
    await db
      .prepare('UPDATE rate_limits SET request_count = 1, window_start = ? WHERE ip = ?')
      .bind(now.toISOString(), ip)
      .run()
    return true
  }
  const count = Number(row.request_count || 0)
  if (count >= RATE_LIMIT_MAX) {
    return false
  }
  await db
    .prepare('UPDATE rate_limits SET request_count = request_count + 1 WHERE ip = ?')
    .bind(ip)
    .run()
  return true
}

export async function recordFailedAttempt(env: Env, ip: string): Promise<void> {
  const row = await env.DB.prepare('SELECT failed_attempts FROM rate_limits WHERE ip = ?')
    .bind(ip)
    .first('failed_attempts')
  if (!row) {
    await env.DB.prepare('INSERT INTO rate_limits (ip, failed_attempts) VALUES (?, 1)')
      .bind(ip)
      .run()
    return
  }
  const failedAttempts = Number(row) + 1
  if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
    const blockedUntil = new Date(Date.now() + BLOCK_DURATION_MS).toISOString()
    await env.DB.prepare(
      'UPDATE rate_limits SET failed_attempts = ?, blocked_until = ? WHERE ip = ?'
    )
      .bind(failedAttempts, blockedUntil, ip)
      .run()
    return
  }
  await env.DB.prepare('UPDATE rate_limits SET failed_attempts = ? WHERE ip = ?')
    .bind(failedAttempts, ip)
    .run()
}

export async function rateLimitMiddleware(
  request: Request,
  env: Env
): Promise<Response | undefined> {
  const ip = getClientIp(request)
  if (await isBlocked(env.DB, ip)) {
    return new Response(JSON.stringify({ error: '请求过于频繁，请稍后再试' }), { status: 429 })
  }
  if (!(await allowRequest(env.DB, ip))) {
    return new Response(JSON.stringify({ error: '请求频率超限' }), { status: 429 })
  }
}
