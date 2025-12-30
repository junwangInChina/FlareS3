import type { Env } from '../config/env'
import { jsonResponse } from './utils'

export async function listAudit(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  const action = url.searchParams.get('action')
  const actorUserId = url.searchParams.get('actor_user_id')
  const createdFrom = url.searchParams.get('created_from')
  const createdTo = url.searchParams.get('created_to')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []
  if (action) {
    conditions.push('a.action = ?')
    params.push(action)
  }
  if (actorUserId) {
    conditions.push('a.actor_user_id = ?')
    params.push(actorUserId)
  }
  if (createdFrom) {
    conditions.push('a.created_at >= ?')
    params.push(createdFrom)
  }
  if (createdTo) {
    conditions.push('a.created_at < ?')
    params.push(createdTo)
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM audit_logs a ${whereClause}`)
    .bind(...params)
    .first('total')
  const total = Number(totalRow || 0)

  const rows = await env.DB.prepare(
    `SELECT a.id, a.actor_user_id, u.username AS actor_username, a.action, a.target_type, a.target_id, a.ip, a.user_agent, a.metadata, a.created_at
     FROM audit_logs a
     LEFT JOIN users u ON u.id = a.actor_user_id
     ${whereClause}
     ORDER BY a.created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all()

  return jsonResponse({
    total,
    page,
    limit,
    logs: rows.results || []
  })
}
