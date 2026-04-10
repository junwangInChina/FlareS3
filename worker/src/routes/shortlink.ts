import type { Env } from '../config/env'
import { getUser, jsonResponse, redirect } from './utils'
import { viewTextShare } from './textShares'
import { tryViewTextOneTimeShare } from './textOneTimeShares'

export async function shortlink(request: Request, env: Env, code: string): Promise<Response> {
  if (!code) return jsonResponse({ error: '短码不能为空' }, 400)
  const file = await env.DB.prepare(
    `SELECT f.id, f.require_login, f.upload_status, f.deleted_at, u.status AS owner_status
     FROM files f
     LEFT JOIN users u ON u.id = f.owner_id
     WHERE f.short_code = ?
     LIMIT 1`
  )
    .bind(code)
    .first()
  if (!file) {
    const oneTime = await tryViewTextOneTimeShare(request, env, code)
    if (oneTime) return oneTime
    return viewTextShare(request, env, code)
  }
  if (
    file.upload_status !== 'completed' ||
    file.deleted_at ||
    String(file.owner_status || '') !== 'active'
  ) {
    return new Response('Not Found', { status: 404 })
  }
  if (Number(file.require_login) === 1) {
    const user = getUser(request)
    if (!user) {
      const next = encodeURIComponent(`/s/${code}`)
      return redirect(`/login?next=${next}`, 302)
    }
  }
  return redirect(`/api/files/${file.id}/download`, 302)
}
