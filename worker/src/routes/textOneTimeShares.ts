import type { Env } from '../config/env'
import { ensureTextsTable, ensureTextOneTimeSharesTable } from '../services/dbSchema'
import { getUser, jsonResponse } from './utils'
import { renderContentPage, renderMessagePage } from './textShares'
import { generateRandomCode } from '../utils/random'

type LoadTextAuthResult =
  | {
      user: NonNullable<ReturnType<typeof getUser>>
      text: { id: string; owner_id: string; title: string }
      ownerId: string
    }
  | { response: Response }

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

function getD1Changes(result: unknown): number {
  const metaChanges = Number((result as any)?.meta?.changes ?? 0)
  return Number.isFinite(metaChanges) ? metaChanges : 0
}

async function loadTextAndAuthorize(
  request: Request,
  env: Env,
  textId: string
): Promise<LoadTextAuthResult> {
  const user = getUser(request)
  if (!user) return { response: jsonResponse({ error: '未授权' }, 401) }
  if (!textId) return { response: jsonResponse({ error: 'id 不能为空' }, 400) }

  await ensureTextsTable(env.DB)
  await ensureTextOneTimeSharesTable(env.DB)

  const text = await env.DB.prepare(
    'SELECT id, owner_id, title FROM texts WHERE id = ? AND deleted_at IS NULL LIMIT 1'
  )
    .bind(textId)
    .first<{ id: string; owner_id: string; title: string }>()

  if (!text) {
    return { response: jsonResponse({ error: '文本不存在' }, 404) }
  }

  const ownerId = String(text.owner_id)
  if (user.role !== 'admin' && ownerId !== user.id) {
    return { response: jsonResponse({ error: '无权限' }, 403) }
  }

  return { user, text, ownerId }
}

export async function createTextOneTimeShare(
  request: Request,
  env: Env,
  textId: string
): Promise<Response> {
  const auth = await loadTextAndAuthorize(request, env, textId)
  if ('response' in auth) {
    return auth.response
  }

  const now = new Date()
  const nowIso = now.toISOString()
  const expiresAtIso = new Date(now.getTime() + 60 * 60 * 1000).toISOString()

  const existing = await env.DB.prepare(
    'SELECT id FROM text_one_time_shares WHERE text_id = ? LIMIT 1'
  )
    .bind(textId)
    .first()

  if (!existing) {
    const id = crypto.randomUUID()
    for (let i = 0; i < 10; i += 1) {
      const shareCode = generateRandomCode(8)
      const result = await env.DB.prepare(
        `INSERT INTO text_one_time_shares (id, text_id, owner_id, share_code, expires_at, consumed_at, created_at, updated_at)
	         VALUES (?, ?, ?, ?, ?, NULL, ?, ?)`
      )
        .bind(id, textId, auth.ownerId, shareCode, expiresAtIso, nowIso, nowIso)
        .run()

      if (!result.error) {
        return jsonResponse({ share: { share_code: shareCode, expires_at: expiresAtIso } })
      }
    }

    return jsonResponse({ error: '生成一次性分享链接失败' }, 500)
  }

  const shareId = String((existing as any).id)
  for (let i = 0; i < 10; i += 1) {
    const shareCode = generateRandomCode(8)
    const result = await env.DB.prepare(
      `UPDATE text_one_time_shares
	       SET share_code = ?, expires_at = ?, consumed_at = NULL, created_at = ?, updated_at = ?
	       WHERE id = ?`
    )
      .bind(shareCode, expiresAtIso, nowIso, nowIso, shareId)
      .run()

    if (!result.error) {
      return jsonResponse({ share: { share_code: shareCode, expires_at: expiresAtIso } })
    }
  }

  return jsonResponse({ error: '生成一次性分享链接失败' }, 500)
}

export async function deleteTextOneTimeShare(
  request: Request,
  env: Env,
  textId: string
): Promise<Response> {
  const auth = await loadTextAndAuthorize(request, env, textId)
  if ('response' in auth) {
    return auth.response
  }

  const existing = await env.DB.prepare(
    'SELECT id FROM text_one_time_shares WHERE text_id = ? LIMIT 1'
  )
    .bind(textId)
    .first<{ id: string }>()

  if (!existing) {
    return jsonResponse({ success: true, deleted: false })
  }

  const result = await env.DB.prepare('DELETE FROM text_one_time_shares WHERE id = ?')
    .bind(existing.id)
    .run()

  return jsonResponse({
    success: true,
    deleted: getD1Changes(result) > 0,
  })
}

export async function tryViewTextOneTimeShare(
  request: Request,
  env: Env,
  code: string
): Promise<Response | null> {
  if (!code) return null

  await ensureTextsTable(env.DB)
  await ensureTextOneTimeSharesTable(env.DB)

  const share = await env.DB.prepare(
    `SELECT s.id, s.text_id, s.share_code, s.expires_at, s.consumed_at,
            t.title AS text_title, t.content AS text_content, t.deleted_at AS text_deleted_at,
            u.status AS owner_status
     FROM text_one_time_shares s
     LEFT JOIN texts t ON t.id = s.text_id
     LEFT JOIN users u ON u.id = s.owner_id
     WHERE s.share_code = ?
     LIMIT 1`
  )
    .bind(code)
    .first()

  if (!share) return null

  if ((share as any).text_deleted_at) {
    return renderMessagePage('分享', '内容不存在', 404)
  }

  if (String((share as any).owner_status || '') !== 'active') {
    return renderMessagePage('分享', '内容不存在', 404)
  }

  const expiresAt = String((share as any).expires_at || '').trim()
  if (expiresAt) {
    const expiresAtMs = new Date(expiresAt).getTime()
    if (Number.isFinite(expiresAtMs) && Date.now() > expiresAtMs) {
      return renderMessagePage('分享', '链接已过期', 410)
    }
  }

  const consumedAt = String((share as any).consumed_at || '').trim()
  if (consumedAt) {
    return renderMessagePage('分享', '链接已失效', 410)
  }

  const shareId = String((share as any).id)
  const nowIso = new Date().toISOString()
  const update = await env.DB.prepare(
    `UPDATE text_one_time_shares
     SET consumed_at = ?, updated_at = ?
     WHERE id = ? AND consumed_at IS NULL AND expires_at > ?`
  )
    .bind(nowIso, nowIso, shareId, nowIso)
    .run()

  if (update.error) {
    return renderMessagePage('分享', '服务异常', 500)
  }

  if (getD1Changes(update) <= 0) {
    return renderMessagePage('分享', '链接已失效', 410)
  }

  const title = String((share as any).text_title || '共享文档')
  const content = String((share as any).text_content || '')
  const metaParts = ['一次性链接（仅可访问 1 次）']
  if (expiresAt) {
    metaParts.push(`过期时间 ${formatDateTimeLocal(expiresAt)}`)
  }

  return renderContentPage({ title, meta: metaParts.join(' · '), content })
}
