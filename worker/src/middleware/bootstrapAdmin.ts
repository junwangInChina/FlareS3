import type { Env } from '../config/env'
import { getTotalStorage } from '../config/env'
import { hashPassword } from '../services/password'
import { logAudit } from '../services/audit'
import { getClientIp } from './rateLimit'

export async function bootstrapAdmin(request: Request, env: Env): Promise<Response | void> {
  const result = await env.DB.prepare('SELECT COUNT(*) AS count FROM users').first('count')
  const count = Number(result || 0)
  if (count > 0) {
    return
  }
  if (!env.BOOTSTRAP_ADMIN_USER || !env.BOOTSTRAP_ADMIN_PASS) {
    return new Response(JSON.stringify({
      error: '管理员未初始化，请设置 BOOTSTRAP_ADMIN_USER/BOOTSTRAP_ADMIN_PASS'
    }), { status: 500 })
  }
  const now = new Date().toISOString()
  const userId = crypto.randomUUID()
  const quota = getTotalStorage(env)
  await env.DB.prepare(
    `INSERT INTO users (id, username, password_hash, role, status, quota_bytes, created_at, updated_at)
     VALUES (?, ?, ?, 'admin', 'active', ?, ?, ?)`
  )
    .bind(userId, env.BOOTSTRAP_ADMIN_USER, hashPassword(env.BOOTSTRAP_ADMIN_PASS), quota, now, now)
    .run()

  await logAudit(env.DB, {
    actorUserId: userId,
    action: 'BOOTSTRAP_ADMIN',
    targetType: 'user',
    targetId: userId,
    ip: getClientIp(request),
    userAgent: request.headers.get('User-Agent') || undefined
  })
}
