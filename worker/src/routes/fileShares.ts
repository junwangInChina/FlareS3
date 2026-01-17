import type { Env } from '../config/env'
import type { AuthUser } from '../middleware/authSession'
import { getUser, jsonResponse, parseJson } from './utils'
import { ensureFilesTable, ensureFileSharesTable } from '../services/dbSchema'
import { hashPassword, verifyPassword } from '../services/password'

type LoadFileAuthResult =
  | { response: Response }
  | {
      user: AuthUser
      file: unknown
      ownerId: string
    }

function generateShareCode(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

async function loadFileAndAuthorize(
  request: Request,
  env: Env,
  fileId: string
): Promise<LoadFileAuthResult> {
  const user = getUser(request)
  if (!user) {
    return { response: jsonResponse({ error: '未授权' }, 401) }
  }

  if (!fileId) {
    return { response: jsonResponse({ error: 'id 不能为空' }, 400) }
  }

  await ensureFilesTable(env.DB)
  await ensureFileSharesTable(env.DB)

  const file = await env.DB.prepare(
    'SELECT id, owner_id, filename FROM files WHERE id = ? AND upload_status != ? LIMIT 1'
  )
    .bind(fileId, 'deleted')
    .first()

  if (!file) {
    return { response: jsonResponse({ error: '文件不存在' }, 404) }
  }

  const ownerId = String((file as any).owner_id)
  if (user.role !== 'admin' && ownerId !== user.id) {
    return { response: jsonResponse({ error: '无权限' }, 403) }
  }

  return { user, file, ownerId }
}

export async function getFileShare(request: Request, env: Env, fileId: string): Promise<Response> {
  const auth = await loadFileAndAuthorize(request, env, fileId)
  if ('response' in auth) {
    return auth.response
  }

  const share = await env.DB.prepare(
    `SELECT id, file_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
     FROM file_shares
     WHERE file_id = ?
     LIMIT 1`
  )
    .bind(fileId)
    .first()

  if (!share) {
    return jsonResponse({ share: null })
  }

  const hasPassword = Boolean((share as any).password_hash)
  const result = {
    ...(share as any),
    has_password: hasPassword,
  }
  delete (result as any).password_hash

  return jsonResponse({ share: result })
}

export async function upsertFileShare(request: Request, env: Env, fileId: string): Promise<Response> {
  const auth = await loadFileAndAuthorize(request, env, fileId)
  if ('response' in auth) {
    return auth.response
  }

  let body: {
    max_views?: unknown
    expires_at?: unknown
    password?: unknown
    regenerate?: unknown
  }

  try {
    body = await parseJson(request)
  } catch (_error) {
    return jsonResponse({ error: '请求体无效' }, 400)
  }

  const maxViewsRaw = body.max_views
  const maxViews = Number(maxViewsRaw ?? 0)
  if (!Number.isFinite(maxViews) || maxViews < 0) {
    return jsonResponse({ error: 'max_views 无效' }, 400)
  }

  const expiresAtRaw = body.expires_at
  let expiresAt: string | null = null
  let expiresIn = 0

  if (expiresAtRaw === null || expiresAtRaw === undefined || String(expiresAtRaw).trim() === '') {
    expiresAt = null
    expiresIn = 0
  } else {
    const date = new Date(String(expiresAtRaw))
    const time = date.getTime()
    if (Number.isNaN(time)) {
      return jsonResponse({ error: 'expires_at 无效' }, 400)
    }
    if (time <= Date.now()) {
      return jsonResponse({ error: 'expires_at 需要晚于当前时间' }, 400)
    }
    expiresAt = date.toISOString()
    expiresIn = Math.max(1, Math.ceil((time - Date.now()) / 1000))
  }

  const now = new Date().toISOString()

  const existing = await env.DB.prepare(
    'SELECT id, owner_id, share_code, password_hash, views FROM file_shares WHERE file_id = ? LIMIT 1'
  )
    .bind(fileId)
    .first()

  const regenerate = Boolean(body.regenerate)

  const passwordValue = body.password
  const passwordString = typeof passwordValue === 'string' ? passwordValue.trim() : ''
  const shouldClearPassword = passwordValue === null
  const shouldUpdatePassword = typeof passwordValue === 'string' && passwordString.length > 0

  if (!existing) {
    const id = crypto.randomUUID()

    let passwordHash: string | null = null
    if (shouldUpdatePassword) {
      passwordHash = hashPassword(passwordString)
    }

    for (let i = 0; i < 10; i += 1) {
      const shareCode = generateShareCode(8)
      const result = await env.DB.prepare(
        `INSERT INTO file_shares (id, file_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
        .bind(
          id,
          fileId,
          auth.ownerId,
          shareCode,
          passwordHash,
          expiresIn,
          expiresAt,
          Math.floor(maxViews),
          now,
          now
        )
        .run()

      if (!result.error) {
        const saved = await env.DB.prepare(
          `SELECT id, file_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
           FROM file_shares
           WHERE file_id = ?
           LIMIT 1`
        )
          .bind(fileId)
          .first()

        const hasPassword = Boolean((saved as any)?.password_hash)
        const responseShare = {
          ...(saved as any),
          has_password: hasPassword,
        }
        delete (responseShare as any).password_hash
        return jsonResponse({ share: responseShare })
      }
    }

    return jsonResponse({ error: '生成分享链接失败' }, 500)
  }

  const shareId = String((existing as any).id)
  const currentShareCode = String((existing as any).share_code)

  const nextShareCode = regenerate ? generateShareCode(8) : currentShareCode

  const updates: string[] = ['max_views = ?', 'expires_in = ?', 'expires_at = ?', 'updated_at = ?']
  const params: unknown[] = [Math.floor(maxViews), expiresIn, expiresAt, now]

  if (regenerate) {
    updates.unshift('share_code = ?')
    params.unshift(nextShareCode)
  }

  if (shouldClearPassword) {
    updates.push('password_hash = NULL')
  } else if (shouldUpdatePassword) {
    updates.push('password_hash = ?')
    params.push(hashPassword(passwordString))
  }

  params.push(shareId)

  if (regenerate) {
    for (let i = 0; i < 10; i += 1) {
      const code = i === 0 ? nextShareCode : generateShareCode(8)
      const loopParams = params.slice()
      ;(loopParams as any)[0] = code

      const result = await env.DB.prepare(
        `UPDATE file_shares SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...loopParams)
        .run()

      if (!result.error) {
        const saved = await env.DB.prepare(
          `SELECT id, file_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
           FROM file_shares
           WHERE id = ?
           LIMIT 1`
        )
          .bind(shareId)
          .first()

        const hasPassword = Boolean((saved as any)?.password_hash)
        const responseShare = {
          ...(saved as any),
          has_password: hasPassword,
        }
        delete (responseShare as any).password_hash
        return jsonResponse({ share: responseShare })
      }
    }

    return jsonResponse({ error: '重置分享链接失败' }, 500)
  }

  const updateResult = await env.DB.prepare(
    `UPDATE file_shares SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...params)
    .run()

  if (updateResult.error) {
    return jsonResponse({ error: '保存分享设置失败' }, 400)
  }

  const saved = await env.DB.prepare(
    `SELECT id, file_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
     FROM file_shares
     WHERE id = ?
     LIMIT 1`
  )
    .bind(shareId)
    .first()

  const hasPassword = Boolean((saved as any)?.password_hash)
  const responseShare = {
    ...(saved as any),
    has_password: hasPassword,
  }
  delete (responseShare as any).password_hash

  return jsonResponse({ share: responseShare })
}

export async function deleteFileShare(request: Request, env: Env, fileId: string): Promise<Response> {
  const auth = await loadFileAndAuthorize(request, env, fileId)
  if ('response' in auth) {
    return auth.response
  }

  const share = await env.DB.prepare('SELECT id FROM file_shares WHERE file_id = ? LIMIT 1')
    .bind(fileId)
    .first()

  if (!share) {
    return jsonResponse({ success: true, deleted: false })
  }

  const result = await env.DB.prepare('DELETE FROM file_shares WHERE id = ?')
    .bind(String((share as any).id))
    .run()

  if (result.error) {
    return jsonResponse({ error: '关闭分享失败' }, 400)
  }

  return jsonResponse({ success: true, deleted: true })
}
