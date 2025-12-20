import type { Env } from '../config/env'

const COOKIE_NAME = 'r2box_session'

export type AuthUser = {
  id: string
  username: string
  role: 'admin' | 'user'
  status: 'active' | 'disabled' | 'deleted'
  quota_bytes: number
}

function parseCookies(request: Request): Record<string, string> {
  const header = request.headers.get('Cookie') || ''
  const cookies: Record<string, string> = {}
  header.split(';').forEach(part => {
    const [name, ...rest] = part.trim().split('=')
    if (!name) return
    cookies[name] = rest.join('=')
  })
  return cookies
}

async function hashToken(token: string): Promise<string> {
  const data = new TextEncoder().encode(token)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = new Uint8Array(digest)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

export function getSessionCookieName(): string {
  return COOKIE_NAME
}

export async function authSessionMiddleware(request: Request, env: Env): Promise<Response | void> {
  const cookies = parseCookies(request)
  const header = request.headers.get('Authorization')
  let token = cookies[COOKIE_NAME]
  if (!token && header && header.startsWith('Bearer ')) {
    token = header.replace('Bearer ', '').trim()
  }
  if (!token) {
    return
  }
  const tokenHash = await hashToken(token)
  const session = await env.DB.prepare(
    `SELECT id, user_id, expires_at, revoked_at FROM sessions WHERE token_hash = ? LIMIT 1`
  )
    .bind(tokenHash)
    .first()
  if (!session || session.revoked_at) {
    return
  }
  const expiresAt = new Date(String(session.expires_at))
  if (Number.isNaN(expiresAt.getTime()) || Date.now() > expiresAt.getTime()) {
    return
  }
  const user = await env.DB.prepare(
    `SELECT id, username, role, status, quota_bytes FROM users WHERE id = ? LIMIT 1`
  )
    .bind(session.user_id)
    .first()
  if (!user || user.status !== 'active') {
    return
  }
  const req = request as Request & { user?: AuthUser; sessionId?: string }
  req.user = {
    id: String(user.id),
    username: String(user.username),
    role: user.role as 'admin' | 'user',
    status: user.status as 'active' | 'disabled' | 'deleted',
    quota_bytes: Number(user.quota_bytes)
  }
  req.sessionId = String(session.id)
}
