import type { AuthUser } from './authSession'

export function requireAuth(request: Request): Response | void {
  const req = request as Request & { user?: AuthUser }
  if (!req.user) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401 })
  }
}

export function requireAdmin(request: Request): Response | void {
  const req = request as Request & { user?: AuthUser }
  if (!req.user) {
    return new Response(JSON.stringify({ error: '未授权' }), { status: 401 })
  }
  if (req.user.role !== 'admin') {
    return new Response(JSON.stringify({ error: '无权限' }), { status: 403 })
  }
}
