import type { Env } from '../config/env'
import type { AuthUser } from '../middleware/authSession'
import { calcPresignedDownloadUrlTtlSeconds, getUser, jsonResponse, parseJson } from './utils'
import { ensureFilesTable, ensureFileSharesTable } from '../services/dbSchema'
import { hashPassword, verifyPassword } from '../services/password'
import { generateDownloadUrl, resolveR2ConfigForKey } from '../services/r2'
import { buildPage, escapeHtml, htmlResponse } from './sharePage'

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

type ResolveFileShareRecordResult =
  | { error: { status: number; message: string } }
  | {
      share: {
        id: string
        file_id: string
        share_code: string
        password_hash: string | null
        expires_at: string | null
        max_views: number
        views: number
      }
      file: {
        filename: string
        r2_key: string
        expires_at: string
      }
    }

function formatDateTimeLocal(isoString: string | null): string {
  if (!isoString) return ''
  const date = new Date(isoString)
  const time = date.getTime()
  if (Number.isNaN(time)) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  const y = date.getFullYear()
  const m = pad(date.getMonth() + 1)
  const d = pad(date.getDate())
  const hh = pad(date.getHours())
  const mm = pad(date.getMinutes())
  return `${y}-${m}-${d} ${hh}:${mm}`
}

async function resolveFileShareRecord(env: Env, code: string): Promise<ResolveFileShareRecordResult> {
  await ensureFilesTable(env.DB)
  await ensureFileSharesTable(env.DB)

  const row = await env.DB.prepare(
    `SELECT s.id AS share_id, s.file_id, s.share_code, s.password_hash, s.expires_at AS share_expires_at, s.max_views, s.views,
            f.filename, f.r2_key, f.expires_at AS file_expires_at, f.upload_status, f.deleted_at
     FROM file_shares s
     LEFT JOIN files f ON f.id = s.file_id
     WHERE s.share_code = ?
     LIMIT 1`
  )
    .bind(code)
    .first()

  if (!row) {
    return { error: { status: 404, message: '分享链接不存在' } }
  }

  if (!row.filename || !row.r2_key || row.upload_status !== 'completed' || row.deleted_at) {
    return { error: { status: 404, message: '文件不存在' } }
  }

  const fileExpiresAt = new Date(String(row.file_expires_at))
  const fileExpiresAtMs = fileExpiresAt.getTime()
  if (Number.isNaN(fileExpiresAtMs)) {
    return { error: { status: 500, message: '文件过期时间无效' } }
  }
  if (Date.now() > fileExpiresAtMs) {
    return { error: { status: 410, message: '文件已过期' } }
  }

  const shareExpiresAtRaw = row.share_expires_at ? String(row.share_expires_at).trim() : ''
  if (shareExpiresAtRaw) {
    const shareExpiresAt = new Date(shareExpiresAtRaw)
    const shareExpiresAtMs = shareExpiresAt.getTime()
    if (Number.isNaN(shareExpiresAtMs)) {
      return { error: { status: 500, message: '链接过期时间无效' } }
    }
    if (Date.now() > shareExpiresAtMs) {
      return { error: { status: 410, message: '链接已过期' } }
    }
  }

  const maxViews = Number(row.max_views ?? 0)
  const views = Number(row.views ?? 0)
  const safeMaxViews = Number.isFinite(maxViews) ? Math.floor(maxViews) : 0
  const safeViews = Number.isFinite(views) ? Math.floor(views) : 0
  if (safeMaxViews > 0 && safeViews >= safeMaxViews) {
    return { error: { status: 410, message: '可访问次数已用尽' } }
  }

  return {
    share: {
      id: String(row.share_id),
      file_id: String(row.file_id),
      share_code: String(row.share_code),
      password_hash: row.password_hash ? String(row.password_hash) : null,
      expires_at: shareExpiresAtRaw || null,
      max_views: safeMaxViews,
      views: safeViews,
    },
    file: {
      filename: String(row.filename),
      r2_key: String(row.r2_key),
      expires_at: String(row.file_expires_at),
    },
  }
}

async function incrementFileShareViews(env: Env, shareId: string): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare('UPDATE file_shares SET views = views + 1, updated_at = ? WHERE id = ?')
    .bind(now, shareId)
    .run()
}

function renderFileMessagePage(title: string, message: string, status = 200): Response {
  const html = buildPage({
    title,
    body: `
<div class="header">
  <h1 class="title">${escapeHtml(title)}</h1>
  <div class="meta"></div>
</div>
<div class="body">
  <p class="muted">${escapeHtml(message)}</p>
</div>`,
  })

  return htmlResponse(html, status)
}

function renderFilePasswordForm({
  title,
  meta,
  error,
}: {
  title: string
  meta: string
  error?: string
}): Response {
  const errorHtml = error ? `<p class="error">${escapeHtml(error)}</p>` : ''
  const html = buildPage({
    title,
    body: `
<div class="header">
  <h1 class="title">${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
</div>
<div class="body">
  <p class="muted">该文件需要访问口令。</p>
  ${errorHtml}
  <form method="post">
    <label for="password">访问口令</label>
    <input id="password" name="password" type="password" autocomplete="current-password" autofocus />
    <button type="submit">下载文件</button>
  </form>
</div>`,
  })

  return htmlResponse(html, 200)
}

type PresignedDownloadResult =
  | { ok: true; url: string }
  | { ok: false; error: { status: number; message: string } }

async function buildPresignedDownloadUrl(
  env: Env,
  file: { r2_key: string; filename: string; expires_at: string }
): Promise<PresignedDownloadResult> {
  const loaded = await resolveR2ConfigForKey(env, file.r2_key)
  if (!loaded) {
    return { ok: false, error: { status: 503, message: 'R2 未配置' } }
  }

  const expiresAt = new Date(file.expires_at)
  const expiresAtMs = expiresAt.getTime()
  if (Number.isNaN(expiresAtMs)) {
    return { ok: false, error: { status: 500, message: '文件过期时间无效' } }
  }

  const ttl = calcPresignedDownloadUrlTtlSeconds(expiresAt)
  const url = await generateDownloadUrl(loaded.config, file.r2_key, file.filename, ttl)
  return { ok: true, url }
}

export async function viewFileShare(request: Request, env: Env, code: string): Promise<Response> {
  const normalized = String(code || '').trim()
  if (!normalized) {
    return renderFileMessagePage('分享', '短码不能为空', 400)
  }

  const resolved = await resolveFileShareRecord(env, normalized)
  if ('error' in resolved) {
    return renderFileMessagePage('分享', resolved.error.message, resolved.error.status)
  }

  const share = resolved.share
  const file = resolved.file
  const title = file.filename || '共享文件'

  const meta = (() => {
    const parts: string[] = []
    if (share.max_views > 0) {
      parts.push(`已访问 ${share.views}/${share.max_views}`)
    } else {
      parts.push(`已访问 ${share.views}`)
    }
    if (share.expires_at) {
      parts.push(`过期时间 ${formatDateTimeLocal(share.expires_at)}`)
    }
    return parts.join(' · ')
  })()

  const passwordHash = String(share.password_hash || '').trim()
  const needsPassword = Boolean(passwordHash)

  const method = request.method.toUpperCase()

  if (method === 'GET') {
    if (needsPassword) {
      return renderFilePasswordForm({ title, meta })
    }

    await incrementFileShareViews(env, share.id)
    const presigned = await buildPresignedDownloadUrl(env, file)
    if (!presigned.ok) {
      return renderFileMessagePage('分享', presigned.error.message, presigned.error.status)
    }
    return Response.redirect(presigned.url, 302)
  }

  if (method === 'POST') {
    if (!needsPassword) {
      await incrementFileShareViews(env, share.id)
      const presigned = await buildPresignedDownloadUrl(env, file)
      if (!presigned.ok) {
        return renderFileMessagePage('分享', presigned.error.message, presigned.error.status)
      }
      return Response.redirect(presigned.url, 302)
    }

    let password = ''
    try {
      const form = await request.formData()
      password = String(form.get('password') || '')
    } catch {
      password = ''
    }

    if (!password) {
      return renderFilePasswordForm({ title, meta, error: '请输入访问口令' })
    }

    if (!verifyPassword(password, passwordHash)) {
      return renderFilePasswordForm({ title, meta, error: '口令不正确' })
    }

    await incrementFileShareViews(env, share.id)
    const presigned = await buildPresignedDownloadUrl(env, file)
    if (!presigned.ok) {
      return renderFileMessagePage('分享', presigned.error.message, presigned.error.status)
    }
    return Response.redirect(presigned.url, 302)
  }

  return new Response('Method Not Allowed', { status: 405 })
}
