import type { Env } from '../config/env'
import { getMaxFileSize } from '../config/env'
import { jsonResponse, parseJson, getUser } from './utils'
import { loadR2Config, generateUploadUrl, generateDownloadUrl, initiateMultipartUpload, generateMultipartUploadUrl, listParts, completeMultipartUpload } from '../services/r2'
import { getUserUsedSpace } from '../services/quota'
import { logAudit } from '../services/audit'
import { getClientIp } from '../middleware/rateLimit'

const ALLOWED_EXPIRES = new Set([-30, 1, 3, 7, 30])
const PART_SIZE = 20 * 1024 * 1024

function getFileExtension(filename: string): string {
  const index = filename.lastIndexOf('.')
  return index >= 0 ? filename.slice(index) : ''
}

function generateShortCode(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

function calcExpiresAt(expiresIn: number): Date {
  const now = new Date()
  if (expiresIn === -30) {
    return new Date(now.getTime() + 30 * 1000)
  }
  return new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000)
}

async function createFileRecord(env: Env, userId: string, filename: string, size: number, contentType: string, expiresIn: number, requireLogin: boolean): Promise<{ id: string; r2Key: string; shortCode: string; expiresAt: Date }> {
  const id = crypto.randomUUID()
  const r2Key = `flares3/${id}${getFileExtension(filename)}`
  const expiresAt = calcExpiresAt(expiresIn)
  let shortCode = ''
  for (let i = 0; i < 10; i += 1) {
    shortCode = generateShortCode()
    const now = new Date().toISOString()
    const result = await env.DB.prepare(
      `INSERT INTO files (id, owner_id, filename, r2_key, size, content_type, expires_in, created_at, expires_at, upload_status, short_code, require_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(id, userId, filename, r2Key, size, contentType, expiresIn, now, expiresAt.toISOString(), shortCode, requireLogin ? 1 : 0)
      .run()
    if (!result.error) {
      return { id, r2Key, shortCode, expiresAt }
    }
  }
  throw new Error('short_code_generation_failed')
}

export async function presignUpload(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const loaded = await loadR2Config(env)
  if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

  try {
    const body = await parseJson<{ filename: string; content_type?: string; size: number; expires_in: number; require_login?: boolean }>(request)
    if (!body.filename || !body.size) {
      return jsonResponse({ error: '无效的请求' }, 400)
    }
    if (!ALLOWED_EXPIRES.has(body.expires_in)) {
      body.expires_in = 7
    }
    const maxSize = getMaxFileSize(env)
    if (body.size > maxSize) {
      return jsonResponse({ error: '文件大小超过限制' }, 413)
    }
    const used = await getUserUsedSpace(env.DB, user.id)
    if (used + body.size > user.quota_bytes) {
      return jsonResponse({ error: '超出配额' }, 413)
    }
    const contentType = body.content_type || 'application/octet-stream'
    const requireLogin = body.require_login !== false
    const file = await createFileRecord(env, user.id, body.filename, body.size, contentType, body.expires_in, requireLogin)
    const uploadUrl = await generateUploadUrl(loaded.config, file.r2Key, contentType, 3600)

    await logAudit(env.DB, {
      actorUserId: user.id,
      action: 'UPLOAD_PRESIGN',
      targetType: 'file',
      targetId: file.id,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined
    })

    return jsonResponse({
      file_id: file.id,
      upload_url: uploadUrl,
      download_url: `/api/files/${file.id}/download`,
      short_url: `/s/${file.shortCode}`,
      expires_at: file.expiresAt.toISOString()
    })
  } catch (error) {
    return jsonResponse({ error: '生成上传 URL 失败' }, 500)
  }
}

export async function confirmUpload(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const loaded = await loadR2Config(env)
  if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

  try {
    const body = await parseJson<{ file_id: string }>(request)
    const file = await env.DB.prepare(
      'SELECT id, owner_id, filename, r2_key, expires_at, short_code, require_login FROM files WHERE id = ? LIMIT 1'
    )
      .bind(body.file_id)
      .first()
    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }
    await env.DB.prepare('UPDATE files SET upload_status = ? WHERE id = ?')
      .bind('completed', body.file_id)
      .run()

    let downloadUrl = `/api/files/${body.file_id}/download`
    const allowDirect = Number(file.require_login) === 0
    if (allowDirect) {
      try {
        const expiresAt = new Date(String(file.expires_at))
        const ttl = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        downloadUrl = await generateDownloadUrl(loaded.config, String(file.r2_key), String(file.filename), ttl)
      } catch (error) {
        downloadUrl = `/api/files/${body.file_id}/download`
      }
    }

    return jsonResponse({
      success: true,
      download_url: downloadUrl,
      short_url: `/s/${file.short_code}`
    })
  } catch (error) {
    return jsonResponse({ error: '确认上传失败' }, 500)
  }
}

export async function initMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const loaded = await loadR2Config(env)
  if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

  try {
    const body = await parseJson<{ filename: string; content_type?: string; size: number; expires_in: number; require_login?: boolean }>(request)
    if (!body.filename || !body.size) {
      return jsonResponse({ error: '无效的请求' }, 400)
    }
    if (!ALLOWED_EXPIRES.has(body.expires_in)) {
      body.expires_in = 7
    }
    const maxSize = getMaxFileSize(env)
    if (body.size > maxSize) {
      return jsonResponse({ error: '文件大小超过限制' }, 413)
    }
    const used = await getUserUsedSpace(env.DB, user.id)
    if (used + body.size > user.quota_bytes) {
      return jsonResponse({ error: '超出配额' }, 413)
    }
    const contentType = body.content_type || 'application/octet-stream'
    const requireLogin = body.require_login !== false
    const file = await createFileRecord(env, user.id, body.filename, body.size, contentType, body.expires_in, requireLogin)
    const uploadId = await initiateMultipartUpload(loaded.config, file.r2Key, contentType)

    await env.DB.prepare('UPDATE files SET upload_status = ? WHERE id = ?')
      .bind('uploading', file.id)
      .run()

    return jsonResponse({
      file_id: file.id,
      upload_id: uploadId,
      part_size: PART_SIZE,
      total_parts: Math.ceil(body.size / PART_SIZE)
    })
  } catch (error) {
    return jsonResponse({ error: '初始化分片上传失败' }, 500)
  }
}

export async function presignMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const loaded = await loadR2Config(env)
  if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

  try {
    const body = await parseJson<{ file_id: string; upload_id: string; part_number: number }>(request)
    const file = await env.DB.prepare('SELECT id, owner_id, r2_key FROM files WHERE id = ?')
      .bind(body.file_id)
      .first()
    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }
    const uploadUrl = await generateMultipartUploadUrl(loaded.config, String(file.r2_key), body.upload_id, body.part_number, 3600)
    return jsonResponse({ upload_url: uploadUrl, part_number: body.part_number })
  } catch (error) {
    return jsonResponse({ error: '生成分片上传 URL 失败' }, 500)
  }
}

export async function completeMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const loaded = await loadR2Config(env)
  if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

  try {
    const body = await parseJson<{ file_id: string; upload_id: string }>(request)
    const file = await env.DB.prepare('SELECT id, owner_id, filename, r2_key, expires_at, short_code, require_login FROM files WHERE id = ?')
      .bind(body.file_id)
      .first()
    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }
    const parts = await listParts(loaded.config, String(file.r2_key), body.upload_id)
    await completeMultipartUpload(loaded.config, String(file.r2_key), body.upload_id, parts)
    await env.DB.prepare('UPDATE files SET upload_status = ? WHERE id = ?')
      .bind('completed', file.id)
      .run()

    let downloadUrl = `/api/files/${file.id}/download`
    const allowDirect = Number(file.require_login) === 0
    if (allowDirect) {
      try {
        const expiresAt = new Date(String(file.expires_at))
        const ttl = Math.max(60, Math.floor((expiresAt.getTime() - Date.now()) / 1000))
        downloadUrl = await generateDownloadUrl(loaded.config, String(file.r2_key), String(file.filename), ttl)
      } catch (error) {
        downloadUrl = `/api/files/${file.id}/download`
      }
    }

    return jsonResponse({
      file_id: file.id,
      download_url: downloadUrl,
      short_url: `/s/${file.short_code}`,
      expires_at: String(file.expires_at)
    })
  } catch (error) {
    return jsonResponse({ error: '完成分片上传失败' }, 500)
  }
}
