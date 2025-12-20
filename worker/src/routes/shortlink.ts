import type { Env } from '../config/env'
import { getUser } from './utils'
import { jsonResponse } from './utils'

export async function shortlink(request: Request, env: Env, code: string): Promise<Response> {
  if (!code) return jsonResponse({ error: '短码不能为空' }, 400)
  const file = await env.DB.prepare(
    'SELECT id, require_login FROM files WHERE short_code = ? LIMIT 1'
  )
    .bind(code)
    .first()
  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (Number(file.require_login) === 1) {
    const user = getUser(request)
    if (!user) {
      const next = encodeURIComponent(`/s/${code}`)
      return Response.redirect(`/login?next=${next}`, 302)
    }
  }
  return Response.redirect(`/api/files/${file.id}/download`, 302)
}
