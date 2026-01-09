import type { Env } from '../config/env'
import { jsonResponse, parseJson, getUser } from './utils'
import { ensureTextsTable } from '../services/dbSchema'
import { logAudit } from '../services/audit'
import { getClientIp } from '../middleware/rateLimit'

const MAX_TITLE_LENGTH = 200
const MAX_CONTENT_LENGTH = 100_000

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function clampString(value: string, maxLength: number): string {
  if (!value) return ''
  return value.length > maxLength ? value.slice(0, maxLength) : value
}

export async function listTexts(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  await ensureTextsTable(env.DB)

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  const q = String(url.searchParams.get('q') || '').trim()
  const ownerId = String(url.searchParams.get('owner_id') || '').trim()
  const offset = (page - 1) * limit

  const conditions: string[] = ['t.deleted_at IS NULL']
  const params: unknown[] = []

  if (user.role !== 'admin') {
    conditions.push('t.owner_id = ?')
    params.push(user.id)
  } else if (ownerId) {
    conditions.push('t.owner_id = ?')
    params.push(ownerId)
  }

  if (q) {
    conditions.push('(t.title LIKE ? OR t.content LIKE ?)')
    const like = `%${q}%`
    params.push(like, like)
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM texts t ${whereClause}`)
    .bind(...params)
    .first('total')
  const total = Number(totalRow || 0)

  const rows = await env.DB.prepare(
    `SELECT t.id, t.owner_id, u.username AS owner_username, t.title,
            SUBSTR(t.content, 1, 200) AS content_preview,
            LENGTH(t.content) AS content_length,
            t.created_at, t.updated_at
     FROM texts t
     LEFT JOIN users u ON u.id = t.owner_id
     ${whereClause}
     ORDER BY t.updated_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all()

  return jsonResponse({
    total,
    page,
    limit,
    texts: rows.results || [],
  })
}

export async function getText(request: Request, env: Env, textId: string): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  if (!textId) return jsonResponse({ error: 'id 不能为空' }, 400)

  await ensureTextsTable(env.DB)

  const row = await env.DB.prepare(
    `SELECT t.id, t.owner_id, u.username AS owner_username, t.title, t.content, t.created_at, t.updated_at
     FROM texts t
     LEFT JOIN users u ON u.id = t.owner_id
     WHERE t.id = ? AND t.deleted_at IS NULL
     LIMIT 1`
  )
    .bind(textId)
    .first()

  if (!row) {
    return jsonResponse({ error: '文本不存在' }, 404)
  }

  if (user.role !== 'admin' && String((row as any).owner_id) !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }

  return jsonResponse({ text: row })
}

export async function createText(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  await ensureTextsTable(env.DB)

  let body: { title?: unknown; content?: unknown }
  try {
    body = await parseJson(request)
  } catch (_error) {
    return jsonResponse({ error: '请求体无效' }, 400)
  }

  const title = clampString(normalizeString(body.title).trim(), MAX_TITLE_LENGTH)
  const content = normalizeString(body.content).trim()

  if (!content) {
    return jsonResponse({ error: '内容不能为空' }, 400)
  }

  if (content.length > MAX_CONTENT_LENGTH) {
    return jsonResponse({ error: '内容过长' }, 413)
  }

  const id = crypto.randomUUID()
  const now = new Date().toISOString()

  const result = await env.DB.prepare(
    `INSERT INTO texts (id, owner_id, title, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
    .bind(id, user.id, title, content, now, now)
    .run()

  if (result.error) {
    return jsonResponse({ error: '保存文本失败' }, 400)
  }

  await logAudit(env.DB, {
    actorUserId: user.id,
    action: 'TEXT_CREATE',
    targetType: 'text',
    targetId: id,
    ip: getClientIp(request),
    userAgent: request.headers.get('User-Agent') || undefined,
    metadata: { length: content.length },
  })

  return jsonResponse({ success: true, id })
}

export async function updateText(request: Request, env: Env, textId: string): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  if (!textId) return jsonResponse({ error: 'id 不能为空' }, 400)

  await ensureTextsTable(env.DB)

  const existing = await env.DB.prepare(
    'SELECT id, owner_id FROM texts WHERE id = ? AND deleted_at IS NULL LIMIT 1'
  )
    .bind(textId)
    .first()

  if (!existing) {
    return jsonResponse({ error: '文本不存在' }, 404)
  }

  if (user.role !== 'admin' && String((existing as any).owner_id) !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }

  let body: { title?: unknown; content?: unknown }
  try {
    body = await parseJson(request)
  } catch (_error) {
    return jsonResponse({ error: '请求体无效' }, 400)
  }

  const updates: string[] = []
  const params: unknown[] = []

  if (body.title !== undefined) {
    const title = clampString(normalizeString(body.title).trim(), MAX_TITLE_LENGTH)
    updates.push('title = ?')
    params.push(title)
  }

  if (body.content !== undefined) {
    const content = normalizeString(body.content).trim()
    if (!content) {
      return jsonResponse({ error: '内容不能为空' }, 400)
    }
    if (content.length > MAX_CONTENT_LENGTH) {
      return jsonResponse({ error: '内容过长' }, 413)
    }
    updates.push('content = ?')
    params.push(content)
  }

  if (!updates.length) {
    return jsonResponse({ error: '无可更新字段' }, 400)
  }

  const now = new Date().toISOString()
  updates.push('updated_at = ?')
  params.push(now)
  params.push(textId)

  const result = await env.DB.prepare(`UPDATE texts SET ${updates.join(', ')} WHERE id = ?`)
    .bind(...params)
    .run()

  if (result.error) {
    return jsonResponse({ error: '更新文本失败' }, 400)
  }

  await logAudit(env.DB, {
    actorUserId: user.id,
    action: 'TEXT_UPDATE',
    targetType: 'text',
    targetId: textId,
    ip: getClientIp(request),
    userAgent: request.headers.get('User-Agent') || undefined,
    metadata: {
      updated_title: body.title !== undefined,
      updated_content: body.content !== undefined,
    },
  })

  return jsonResponse({ success: true })
}

export async function deleteText(request: Request, env: Env, textId: string): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  if (!textId) return jsonResponse({ error: 'id 不能为空' }, 400)

  await ensureTextsTable(env.DB)

  const existing = await env.DB.prepare(
    'SELECT id, owner_id FROM texts WHERE id = ? AND deleted_at IS NULL LIMIT 1'
  )
    .bind(textId)
    .first()

  if (!existing) {
    return jsonResponse({ error: '文本不存在' }, 404)
  }

  if (user.role !== 'admin' && String((existing as any).owner_id) !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }

  const now = new Date().toISOString()
  const result = await env.DB.prepare(
    'UPDATE texts SET deleted_at = ?, updated_at = ? WHERE id = ?'
  )
    .bind(now, now, textId)
    .run()

  if (result.error) {
    return jsonResponse({ error: '删除文本失败' }, 400)
  }

  await logAudit(env.DB, {
    actorUserId: user.id,
    action: 'TEXT_DELETE',
    targetType: 'text',
    targetId: textId,
    ip: getClientIp(request),
    userAgent: request.headers.get('User-Agent') || undefined,
  })

  return jsonResponse({ success: true })
}
