import type { Env } from '../config/env'
import { getTotalStorage } from '../config/env'
import { formatBytes } from '../utils/format'
import { jsonResponse, getUser } from './utils'

export async function getStats(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  const isAdmin = user.role === 'admin'
  const where = isAdmin
    ? "upload_status = 'completed' AND deleted_at IS NULL"
    : "owner_id = ? AND upload_status = 'completed' AND deleted_at IS NULL"
  const params = isAdmin ? [] : [user.id]

  const row = await env.DB.prepare(
    `SELECT COALESCE(SUM(size), 0) AS usedSpace, COUNT(*) AS fileCount FROM files WHERE ${where}`
  )
    .bind(...params)
    .first()

  const usedSpace = Number(row?.usedSpace || 0)
  const fileCount = Number(row?.fileCount || 0)
  const totalSpace = isAdmin ? getTotalStorage(env) : user.quota_bytes

  const today = new Date()
  today.setHours(24, 0, 0, 0)
  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)

  const expiringToday = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM files WHERE ${where} AND expires_at < ?`
  )
    .bind(...params, today.toISOString())
    .first('count')

  const expiringThisWeek = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM files WHERE ${where} AND expires_at < ?`
  )
    .bind(...params, nextWeek.toISOString())
    .first('count')

  const usagePercent = totalSpace ? (usedSpace / totalSpace) * 100 : 0

  return jsonResponse({
    usedSpace,
    totalSpace,
    usedSpaceFormatted: formatBytes(usedSpace),
    totalSpaceFormatted: formatBytes(totalSpace),
    usagePercent,
    fileCount,
    expiringToday: Number(expiringToday || 0),
    expiringThisWeek: Number(expiringThisWeek || 0),
  })
}
