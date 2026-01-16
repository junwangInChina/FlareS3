import type { Env } from '../config/env'
import { getUser, jsonResponse, parseJson } from './utils'
import { ensureTextsTable, ensureTextSharesTable } from '../services/dbSchema'
import { hashPassword, verifyPassword } from '../services/password'

function generateShareCode(length = 8): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function escapeHtml(value: string): string {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function htmlResponse(html: string, status = 200): Response {
  return new Response(html, {
    status,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  })
}

function buildPage({ title, body }: { title: string; body: string }): string {
  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      color-scheme: light;
      --bg: #0b0b0f;
      --card: #12121a;
      --text: #f5f5f7;
      --muted: rgba(245,245,247,.7);
      --border: rgba(245,245,247,.15);
      --primary: #7c3aed;
    }

    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial;
      background: radial-gradient(1200px 800px at 20% 0%, rgba(124,58,237,.25), transparent 55%),
        radial-gradient(900px 600px at 85% 15%, rgba(56,189,248,.18), transparent 60%),
        var(--bg);
      color: var(--text);
    }

    .wrap {
      max-width: 860px;
      margin: 0 auto;
      padding: 32px 16px 64px;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 16px;
      background: color-mix(in oklab, var(--card) 88%, transparent);
      box-shadow: 0 12px 30px rgba(0,0,0,.35);
      overflow: hidden;
    }

    .header {
      padding: 18px 20px;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: 12px;
    }

    .title {
      margin: 0;
      font-size: 18px;
      font-weight: 700;
      letter-spacing: -0.01em;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .meta {
      color: var(--muted);
      font-size: 12px;
      white-space: nowrap;
    }

    .body {
      padding: 18px 20px;
    }

    pre {
      margin: 0;
      white-space: pre-wrap;
      word-break: break-word;
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace;
      font-size: 13px;
      line-height: 1.65;
      color: var(--text);
    }

    .muted {
      color: var(--muted);
      font-size: 14px;
      line-height: 1.6;
      margin: 0;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 12px;
      max-width: 420px;
    }

    label {
      font-size: 13px;
      color: var(--muted);
    }

    input {
      width: 100%;
      padding: 12px 14px;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: rgba(255,255,255,.06);
      color: var(--text);
      outline: none;
    }

    input:focus {
      border-color: color-mix(in oklab, var(--primary) 70%, var(--border));
      box-shadow: 0 0 0 4px rgba(124,58,237,.25);
    }

    button {
      padding: 12px 14px;
      border: 0;
      border-radius: 12px;
      background: var(--primary);
      color: white;
      font-weight: 700;
      cursor: pointer;
    }

    .error {
      margin: 0;
      color: #fb7185;
      font-size: 13px;
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="card">
      ${body}
    </div>
  </div>
</body>
</html>`
}

async function loadTextAndAuthorize(request: Request, env: Env, textId: string) {
  const user = getUser(request)
  if (!user) {
    return { response: jsonResponse({ error: '未授权' }, 401) as Response }
  }

  if (!textId) {
    return { response: jsonResponse({ error: 'id 不能为空' }, 400) as Response }
  }

  await ensureTextsTable(env.DB)
  await ensureTextSharesTable(env.DB)

  const text = await env.DB.prepare(
    'SELECT id, owner_id, title FROM texts WHERE id = ? AND deleted_at IS NULL LIMIT 1'
  )
    .bind(textId)
    .first()

  if (!text) {
    return { response: jsonResponse({ error: '文本不存在' }, 404) as Response }
  }

  const ownerId = String((text as any).owner_id)
  if (user.role !== 'admin' && ownerId !== user.id) {
    return { response: jsonResponse({ error: '无权限' }, 403) as Response }
  }

  return { user, text, ownerId }
}

export async function getTextShare(request: Request, env: Env, textId: string): Promise<Response> {
  const auth = await loadTextAndAuthorize(request, env, textId)
  if ('response' in auth) {
    return auth.response
  }

  const share = await env.DB.prepare(
    `SELECT id, text_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
     FROM text_shares
     WHERE text_id = ?
     LIMIT 1`
  )
    .bind(textId)
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

export async function upsertTextShare(request: Request, env: Env, textId: string): Promise<Response> {
  const auth = await loadTextAndAuthorize(request, env, textId)
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
    'SELECT id, owner_id, share_code, password_hash, views FROM text_shares WHERE text_id = ? LIMIT 1'
  )
    .bind(textId)
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
        `INSERT INTO text_shares (id, text_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`
      )
        .bind(
          id,
          textId,
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
          `SELECT id, text_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
           FROM text_shares
           WHERE text_id = ?
           LIMIT 1`
        )
          .bind(textId)
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
  const currentHasPassword = Boolean((existing as any).password_hash)

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
        `UPDATE text_shares SET ${updates.join(', ')} WHERE id = ?`
      )
        .bind(...loopParams)
        .run()

      if (!result.error) {
        const saved = await env.DB.prepare(
          `SELECT id, text_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
           FROM text_shares
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

  if (!shouldClearPassword && !shouldUpdatePassword && !currentHasPassword) {
    // keep as-is (no password)
  }

  const updateResult = await env.DB.prepare(
    `UPDATE text_shares SET ${updates.join(', ')} WHERE id = ?`
  )
    .bind(...params)
    .run()

  if (updateResult.error) {
    return jsonResponse({ error: '保存分享设置失败' }, 400)
  }

  const saved = await env.DB.prepare(
    `SELECT id, text_id, owner_id, share_code, password_hash, expires_in, expires_at, max_views, views, created_at, updated_at
     FROM text_shares
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

export async function deleteTextShare(request: Request, env: Env, textId: string): Promise<Response> {
  const auth = await loadTextAndAuthorize(request, env, textId)
  if ('response' in auth) {
    return auth.response
  }

  const share = await env.DB.prepare('SELECT id FROM text_shares WHERE text_id = ? LIMIT 1')
    .bind(textId)
    .first()

  if (!share) {
    return jsonResponse({ success: true, deleted: false })
  }

  const result = await env.DB.prepare('DELETE FROM text_shares WHERE id = ?')
    .bind(String((share as any).id))
    .run()

  if (result.error) {
    return jsonResponse({ error: '关闭分享失败' }, 400)
  }

  return jsonResponse({ success: true, deleted: true })
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

async function resolveShareRecord(env: Env, code: string) {
  await ensureTextsTable(env.DB)
  await ensureTextSharesTable(env.DB)

  const share = await env.DB.prepare(
    `SELECT s.id, s.text_id, s.share_code, s.password_hash, s.expires_at, s.max_views, s.views,
            t.title AS text_title, t.content AS text_content, t.deleted_at AS text_deleted_at
     FROM text_shares s
     LEFT JOIN texts t ON t.id = s.text_id
     WHERE s.share_code = ?
     LIMIT 1`
  )
    .bind(code)
    .first()

  if (!share) {
    return { error: { status: 404, message: '分享链接不存在' } }
  }

  if ((share as any).text_deleted_at) {
    return { error: { status: 404, message: '内容不存在' } }
  }

  const expiresAt = String((share as any).expires_at || '').trim()
  if (expiresAt) {
    const expiresAtMs = new Date(expiresAt).getTime()
    if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
      return { error: { status: 410, message: '链接已过期' } }
    }
  }

  const maxViews = Number((share as any).max_views || 0)
  const views = Number((share as any).views || 0)
  if (Number.isFinite(maxViews) && maxViews > 0 && views >= maxViews) {
    return { error: { status: 410, message: '访问次数已用尽' } }
  }

  return { share }
}

async function incrementShareViews(env: Env, shareId: string): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare('UPDATE text_shares SET views = views + 1, updated_at = ? WHERE id = ?')
    .bind(now, shareId)
    .run()
}

function renderPasswordForm({
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
  <p class="muted">该内容需要访问口令。</p>
  ${errorHtml}
  <form method="post">
    <label for="password">访问口令</label>
    <input id="password" name="password" type="password" autocomplete="current-password" autofocus />
    <button type="submit">查看内容</button>
  </form>
</div>`,
  })

  return htmlResponse(html, 200)
}

function renderMessagePage(title: string, message: string, status = 200): Response {
  const html = buildPage({
    title,
    body: `
<div class="header">
  <h1 class="title">${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml('') }</div>
</div>
<div class="body">
  <p class="muted">${escapeHtml(message)}</p>
</div>`,
  })

  return htmlResponse(html, status)
}

function renderContentPage({ title, meta, content }: { title: string; meta: string; content: string }): Response {
  const html = buildPage({
    title,
    body: `
<div class="header">
  <h1 class="title">${escapeHtml(title)}</h1>
  <div class="meta">${escapeHtml(meta)}</div>
</div>
<div class="body">
  <pre>${escapeHtml(content)}</pre>
</div>`,
  })

  return htmlResponse(html, 200)
}

export async function viewTextShare(request: Request, env: Env, code: string): Promise<Response> {
  if (!code) {
    return renderMessagePage('分享', '短码不能为空', 400)
  }

  const resolved = await resolveShareRecord(env, code)
  if ('error' in resolved) {
    return renderMessagePage('分享', resolved.error.message, resolved.error.status)
  }

  const share = resolved.share
  const shareId = String((share as any).id)
  const title = String((share as any).text_title || '共享文档')
  const content = String((share as any).text_content || '')

  const meta = (() => {
    const views = Number((share as any).views || 0)
    const maxViews = Number((share as any).max_views || 0)
    const expiresAt = String((share as any).expires_at || '').trim()

    const parts: string[] = []
    if (Number.isFinite(maxViews) && maxViews > 0) {
      parts.push(`已访问 ${views}/${maxViews}`)
    } else {
      parts.push(`已访问 ${views}`)
    }

    if (expiresAt) {
      parts.push(`过期时间 ${formatDateTimeLocal(expiresAt)}`)
    }

    return parts.join(' · ')
  })()

  const passwordHash = String((share as any).password_hash || '').trim()
  const needsPassword = Boolean(passwordHash)

  if (request.method.toUpperCase() === 'GET') {
    if (needsPassword) {
      return renderPasswordForm({ title, meta })
    }

    await incrementShareViews(env, shareId)
    return renderContentPage({ title, meta, content })
  }

  if (request.method.toUpperCase() === 'POST') {
    if (!needsPassword) {
      await incrementShareViews(env, shareId)
      return renderContentPage({ title, meta, content })
    }

    let password = ''
    try {
      const form = await request.formData()
      password = String(form.get('password') || '')
    } catch {
      password = ''
    }

    if (!password) {
      return renderPasswordForm({ title, meta, error: '请输入访问口令' })
    }

    if (!verifyPassword(password, passwordHash)) {
      return renderPasswordForm({ title, meta, error: '口令不正确' })
    }

    await incrementShareViews(env, shareId)
    return renderContentPage({ title, meta, content })
  }

  return new Response('Method Not Allowed', { status: 405 })
}
