import type { AuthUser } from './authSession'
import { jsonResponse } from '../utils/response'

export function requireAuth(request: Request): Response | void {
  const req = request as Request & { user?: AuthUser }
  if (!req.user) {
    return jsonResponse({ error: '未授权' }, 401)
  }
}

export function requireAdmin(request: Request): Response | void {
  const req = request as Request & { user?: AuthUser }
  if (!req.user) {
    return jsonResponse({ error: '未授权' }, 401)
  }
  if (req.user.role !== 'admin') {
    return jsonResponse({ error: '无权限' }, 403)
  }
}
