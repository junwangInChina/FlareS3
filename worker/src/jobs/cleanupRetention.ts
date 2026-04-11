import type { Env } from '../config/env'

export const SESSION_RETENTION_MS = 7 * 24 * 60 * 60 * 1000
export const RATE_LIMIT_RETENTION_MS = 24 * 60 * 60 * 1000
export const AUDIT_LOG_RETENTION_MS = 90 * 24 * 60 * 60 * 1000

function getChanges(result: unknown): number {
  const changes = (result as { meta?: { changes?: number } } | null)?.meta?.changes
  return Number.isFinite(changes) ? Number(changes) : 0
}

export async function cleanupRetention(
  env: Env,
  now = new Date()
): Promise<{ sessions: number; rateLimits: number; auditLogs: number }> {
  const nowIso = now.toISOString()
  const sessionThresholdIso = new Date(now.getTime() - SESSION_RETENTION_MS).toISOString()
  const rateLimitThresholdIso = new Date(now.getTime() - RATE_LIMIT_RETENTION_MS).toISOString()
  const auditLogThresholdIso = new Date(now.getTime() - AUDIT_LOG_RETENTION_MS).toISOString()

  const sessionResult = await env.DB.prepare(
    `DELETE FROM sessions
     WHERE (revoked_at IS NOT NULL AND revoked_at < ?)
        OR expires_at < ?`
  )
    .bind(sessionThresholdIso, nowIso)
    .run()

  const rateLimitResult = await env.DB.prepare(
    `DELETE FROM rate_limits
     WHERE window_start < ?
       AND (blocked_until IS NULL OR blocked_until < ?)`
  )
    .bind(rateLimitThresholdIso, nowIso)
    .run()

  const auditLogResult = await env.DB.prepare('DELETE FROM audit_logs WHERE created_at < ?')
    .bind(auditLogThresholdIso)
    .run()

  return {
    sessions: getChanges(sessionResult),
    rateLimits: getChanges(rateLimitResult),
    auditLogs: getChanges(auditLogResult),
  }
}
