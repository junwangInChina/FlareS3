import type { Env } from '../config/env'
import { jsonResponse, parseJson } from './utils'

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
    logs: rows.results || [],
  })
}

export async function deleteAudit(request: Request, env: Env, auditId: string): Promise<Response> {
  if (!auditId) {
    return jsonResponse({ error: 'id 不能为空' }, 400)
  }

  const existing = await env.DB.prepare('SELECT id FROM audit_logs WHERE id = ? LIMIT 1')
    .bind(auditId)
    .first('id')

  if (!existing) {
    return jsonResponse({ error: '记录不存在' }, 404)
  }

  await env.DB.prepare('DELETE FROM audit_logs WHERE id = ?').bind(auditId).run()

  return jsonResponse({ success: true })
}

export async function batchDeleteAudit(request: Request, env: Env): Promise<Response> {
  let body: { ids?: unknown }
  try {
    body = await parseJson<{ ids?: unknown }>(request)
  } catch (_error) {
    return jsonResponse({ error: '请求体无效' }, 400)
  }

  const rawIds = Array.isArray(body.ids) ? body.ids : []
  const ids = Array.from(new Set(rawIds.map((value) => String(value ?? '').trim()).filter(Boolean)))

  if (!ids.length) {
    return jsonResponse({ error: 'ids 不能为空' }, 400)
  }

  if (ids.length > 200) {
    return jsonResponse({ error: '一次最多删除 200 条' }, 400)
  }

  const placeholders = ids.map(() => '?').join(',')
  await env.DB.prepare(`DELETE FROM audit_logs WHERE id IN (${placeholders})`)
    .bind(...ids)
    .run()

  return jsonResponse({ success: true, deleted: ids.length })
}
