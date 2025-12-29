import type { Env } from '../config/env'
import { jsonResponse, parseJson, getUser } from './utils'
import { hashPassword } from '../services/password'
import { logAudit } from '../services/audit'
import { getClientIp } from '../middleware/rateLimit'

export async function listUsers(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  const status = url.searchParams.get('status')
  const role = url.searchParams.get('role')
  const q = url.searchParams.get('q')
  const createdFrom = url.searchParams.get('created_from')
  const createdTo = url.searchParams.get('created_to')
  const offset = (page - 1) * limit

  const conditions: string[] = []
  const params: unknown[] = []
  if (status) {
    conditions.push('status = ?')
    params.push(status)
  }
  if (role) {
    conditions.push('role = ?')
    params.push(role)
  }
  if (q) {
    conditions.push('username LIKE ?')
    params.push(`%${q}%`)
  }
  if (createdFrom) {
    conditions.push('created_at >= ?')
    params.push(createdFrom)
  }
  if (createdTo) {
    conditions.push('created_at < ?')
    params.push(createdTo)
  }
  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const totalRow = await env.DB.prepare(`SELECT COUNT(*) AS total FROM users ${whereClause}`)
    .bind(...params)
    .first('total')
  const total = Number(totalRow || 0)

  const rows = await env.DB.prepare(
    `SELECT id, username, role, status, quota_bytes, created_at, last_login_at
     FROM users ${whereClause}
     ORDER BY created_at DESC
     LIMIT ? OFFSET ?`
  )
    .bind(...params, limit, offset)
    .all()

  return jsonResponse({
    total,
    page,
    limit,
    users: rows.results || []
  })
}

export async function createUser(request: Request, env: Env): Promise<Response> {
  try {
    const body = await parseJson<{ username: string; password: string; role?: 'admin' | 'user'; quota_bytes?: number }>(request)
    if (!body.username || !body.password) {
      return jsonResponse({ error: '用户名或密码不能为空' }, 400)
    }
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?').bind(body.username).first()
    if (existing) {
      return jsonResponse({ error: '用户名已存在' }, 409)
    }
    const role = body.role === 'admin' ? 'admin' : 'user'
    const quota = Number(body.quota_bytes || 0)
    if (!Number.isFinite(quota) || quota <= 0) {
      return jsonResponse({ error: '配额无效' }, 400)
    }
    const now = new Date().toISOString()
    const id = crypto.randomUUID()
    await env.DB.prepare(
      `INSERT INTO users (id, username, password_hash, role, status, quota_bytes, created_at, updated_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?)`
    )
      .bind(id, body.username, hashPassword(body.password), role, quota, now, now)
      .run()

    const actor = getUser(request)
    await logAudit(env.DB, {
      actorUserId: actor?.id,
      action: 'USER_CREATE',
      targetType: 'user',
      targetId: id,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined
    })

    return jsonResponse({ success: true, user_id: id })
  } catch (error) {
    return jsonResponse({ error: '创建用户失败' }, 500)
  }
}

export async function updateUser(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await parseJson<{ status?: 'active' | 'disabled' | 'deleted'; role?: 'admin' | 'user'; quota_bytes?: number }>(request)
    const updates: string[] = []
    const params: unknown[] = []
    if (body.status) {
      updates.push('status = ?')
      params.push(body.status)
    }
    if (body.role) {
      updates.push('role = ?')
      params.push(body.role)
    }
    if (body.quota_bytes !== undefined) {
      const quota = Number(body.quota_bytes)
      if (!Number.isFinite(quota) || quota <= 0) {
        return jsonResponse({ error: '配额无效' }, 400)
      }
      updates.push('quota_bytes = ?')
      params.push(quota)
    }
    if (!updates.length) {
      return jsonResponse({ error: '无可更新字段' }, 400)
    }
    updates.push('updated_at = ?')
    params.push(new Date().toISOString())
    params.push(userId)
    await env.DB.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).bind(...params).run()

    const actor = getUser(request)
    await logAudit(env.DB, {
      actorUserId: actor?.id,
      action: 'USER_UPDATE',
      targetType: 'user',
      targetId: userId,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined,
      metadata: body
    })

    return jsonResponse({ success: true })
  } catch (error) {
    return jsonResponse({ error: '更新用户失败' }, 500)
  }
}

export async function resetPassword(request: Request, env: Env, userId: string): Promise<Response> {
  try {
    const body = await parseJson<{ password: string }>(request)
    if (!body.password) {
      return jsonResponse({ error: '密码不能为空' }, 400)
    }
    await env.DB.prepare('UPDATE users SET password_hash = ?, updated_at = ? WHERE id = ?')
      .bind(hashPassword(body.password), new Date().toISOString(), userId)
      .run()

    const actor = getUser(request)
    await logAudit(env.DB, {
      actorUserId: actor?.id,
      action: 'USER_RESET_PASSWORD',
      targetType: 'user',
      targetId: userId,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined
    })

    return jsonResponse({ success: true })
  } catch (error) {
    return jsonResponse({ error: '重置密码失败' }, 500)
  }
}

export async function deleteUser(request: Request, env: Env, userId: string): Promise<Response> {
  const now = new Date().toISOString()
  await env.DB.prepare('UPDATE users SET status = ?, updated_at = ? WHERE id = ?')
    .bind('deleted', now, userId)
    .run()

  const files = await env.DB.prepare(
    `SELECT id, r2_key FROM files WHERE owner_id = ? AND deleted_at IS NULL`
  )
    .bind(userId)
    .all()

  if (files.results && files.results.length) {
    await env.DB.prepare(
      `UPDATE files SET upload_status = 'deleted', deleted_at = ? WHERE owner_id = ? AND deleted_at IS NULL`
    )
      .bind(now, userId)
      .run()

    for (const file of files.results) {
      await env.DB.prepare(
        `INSERT INTO delete_queue (id, file_id, r2_key, created_at) VALUES (?, ?, ?, ?)`
      )
        .bind(crypto.randomUUID(), file.id, file.r2_key, now)
        .run()
    }
  }

  const actor = getUser(request)
  await logAudit(env.DB, {
    actorUserId: actor?.id,
    action: 'USER_DELETE',
    targetType: 'user',
    targetId: userId,
    ip: getClientIp(request),
    userAgent: request.headers.get('User-Agent') || undefined,
    metadata: { queuedFiles: files.results?.length || 0 }
  })

  return jsonResponse({ success: true, queued: true })
}
