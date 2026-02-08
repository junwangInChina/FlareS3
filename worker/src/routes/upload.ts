import type { Env } from '../config/env'
import { getMaxFileSize } from '../config/env'
import { jsonResponse, parseJson, getUser, calcPresignedDownloadUrlTtlSeconds } from './utils'
import {
  abortMultipartUpload,
  deleteObject,
  buildR2Key,
  completeMultipartUpload,
  generateDownloadUrl,
  generateMultipartUploadUrl,
  generateUploadUrl,
  initiateMultipartUpload,
  listParts,
  loadR2Config,
  loadR2ConfigById,
  resolveR2ConfigForKey,
  summarizeS3Error,
} from '../services/r2'
import { logAudit } from '../services/audit'
import { getClientIp } from '../middleware/rateLimit'
import { getUserUsedSpace } from '../services/quota'
import { ensureFilesMultipartUploadIdColumn } from '../services/dbSchema'
import { generateRandomCode } from '../utils/random'

const ALLOWED_EXPIRES = new Set([-30, 0, 1, 3, 7, 30])
const PART_SIZE = 20 * 1024 * 1024
const NEVER_EXPIRES_AT_ISO = '9999-12-31T23:59:59.999Z'

function normalizeExpiresIn(value: unknown): number {
  const expiresIn = Number(value)
  if (!Number.isFinite(expiresIn)) return 7
  return ALLOWED_EXPIRES.has(expiresIn) ? expiresIn : 7
}

function calcExpiresAt(expiresIn: number): Date {
  const now = new Date()
  if (expiresIn === -30) {
    return new Date(now.getTime() + 30 * 1000)
  }
  if (expiresIn === 0) {
    return new Date(NEVER_EXPIRES_AT_ISO)
  }
  return new Date(now.getTime() + expiresIn * 24 * 60 * 60 * 1000)
}

function isNeverExpires(expiresAt: unknown): boolean {
  const value = String(expiresAt || '').trim()
  if (!value) return false
  return value === NEVER_EXPIRES_AT_ISO
}

function isExpired(expiresAt: unknown): boolean {
  if (isNeverExpires(expiresAt)) return false
  const expiresAtMs = new Date(String(expiresAt)).getTime()
  if (Number.isNaN(expiresAtMs)) return true
  return Date.now() > expiresAtMs
}

function calcDownloadTtlSeconds(expiresAt: unknown): number {
  if (isNeverExpires(expiresAt)) {
    return 24 * 60 * 60
  }
  const parsed = new Date(String(expiresAt))
  const parsedMs = parsed.getTime()
  if (Number.isNaN(parsedMs)) {
    return 24 * 60 * 60
  }
  return calcPresignedDownloadUrlTtlSeconds(parsed)
}

async function createFileRecord(
  env: Env,
  userId: string,
  filename: string,
  size: number,
  contentType: string,
  expiresIn: number,
  requireLogin: boolean,
  r2ConfigId: string
): Promise<{ id: string; r2Key: string; shortCode: string; expiresAt: Date }> {
  const id = crypto.randomUUID()
  const r2Key = buildR2Key(r2ConfigId, filename)
  const expiresAt = calcExpiresAt(expiresIn)
  let shortCode = ''
  for (let i = 0; i < 10; i += 1) {
    shortCode = generateRandomCode(6)
    const now = new Date().toISOString()
    const result = await env.DB.prepare(
      `INSERT INTO files (id, owner_id, filename, r2_key, size, content_type, expires_in, created_at, expires_at, upload_status, short_code, require_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
    )
      .bind(
        id,
        userId,
        filename,
        r2Key,
        size,
        contentType,
        expiresIn,
        now,
        expiresAt.toISOString(),
        shortCode,
        requireLogin ? 1 : 0
      )
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

  try {
    const body = await parseJson<{
      filename: string
      content_type?: string
      size: number
      expires_in: number
      require_login?: boolean
      config_id?: string
    }>(request)

    if (!body.filename || !body.size) {
      return jsonResponse({ error: '无效的请求' }, 400)
    }
    const expiresIn = normalizeExpiresIn(body.expires_in)

    const maxSize = getMaxFileSize(env)
    if (body.size > maxSize) {
      return jsonResponse({ error: '文件大小超过限制' }, 413)
    }

    const used = await getUserUsedSpace(env.DB, user.id)
    if (used + body.size > user.quota_bytes) {
      return jsonResponse({ error: '超出配额' }, 413)
    }

    const requestedId = body.config_id
    const loaded = requestedId ? await loadR2ConfigById(env, requestedId) : await loadR2Config(env)

    if (!loaded) {
      if (requestedId) return jsonResponse({ error: '配置不存在或不可用' }, 404)
      return jsonResponse({ error: 'R2 未配置' }, 503)
    }

    const contentType = body.content_type || 'application/octet-stream'
    const requireLogin = body.require_login !== false
    const file = await createFileRecord(
      env,
      user.id,
      body.filename,
      body.size,
      contentType,
      expiresIn,
      requireLogin,
      loaded.id
    )

    const uploadUrl = await generateUploadUrl(loaded.config, file.r2Key, contentType, 3600)

    await logAudit(env.DB, {
      actorUserId: user.id,
      action: 'UPLOAD_PRESIGN',
      targetType: 'file',
      targetId: file.id,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined,
    })

    return jsonResponse({
      file_id: file.id,
      upload_url: uploadUrl,
      download_url: `/api/files/${file.id}/download`,
      short_url: `/s/${file.shortCode}`,
      expires_at: file.expiresAt.toISOString(),
      r2_config_id: loaded.id,
    })
  } catch (error) {
    return jsonResponse({ error: '生成上传 URL 失败' }, 500)
  }
}

export async function confirmUpload(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

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

    const loaded = await resolveR2ConfigForKey(env, String(file.r2_key))
    if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

    await env.DB.prepare('UPDATE files SET upload_status = ? WHERE id = ?')
      .bind('completed', body.file_id)
      .run()

    let downloadUrl = `/api/files/${body.file_id}/download`
    const allowDirect = Number(file.require_login) === 0
    if (allowDirect) {
      try {
        if (!isExpired(file.expires_at)) {
          const ttl = calcDownloadTtlSeconds(file.expires_at)
          downloadUrl = await generateDownloadUrl(
            loaded.config,
            String(file.r2_key),
            String(file.filename),
            ttl
          )
        }
      } catch (error) {
        downloadUrl = `/api/files/${body.file_id}/download`
      }
    }

    return jsonResponse({
      success: true,
      download_url: downloadUrl,
      short_url: `/s/${file.short_code}`,
      r2_config_id: loaded.id,
    })
  } catch (error) {
    return jsonResponse({ error: '确认上传失败' }, 500)
  }
}

export async function initMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  try {
    const body = await parseJson<{
      filename: string
      content_type?: string
      size: number
      expires_in: number
      require_login?: boolean
      config_id?: string
    }>(request)

    if (!body.filename || !body.size) {
      return jsonResponse({ error: '无效的请求' }, 400)
    }
    const expiresIn = normalizeExpiresIn(body.expires_in)

    const maxSize = getMaxFileSize(env)
    if (body.size > maxSize) {
      return jsonResponse({ error: '文件大小超过限制' }, 413)
    }

    const used = await getUserUsedSpace(env.DB, user.id)
    if (used + body.size > user.quota_bytes) {
      return jsonResponse({ error: '超出配额' }, 413)
    }

    const requestedId = body.config_id
    const loaded = requestedId ? await loadR2ConfigById(env, requestedId) : await loadR2Config(env)

    if (!loaded) {
      if (requestedId) return jsonResponse({ error: '配置不存在或不可用' }, 404)
      return jsonResponse({ error: 'R2 未配置' }, 503)
    }

    const contentType = body.content_type || 'application/octet-stream'
    const requireLogin = body.require_login !== false
    const file = await createFileRecord(
      env,
      user.id,
      body.filename,
      body.size,
      contentType,
      expiresIn,
      requireLogin,
      loaded.id
    )

    const uploadId = await initiateMultipartUpload(loaded.config, file.r2Key, contentType)

    await ensureFilesMultipartUploadIdColumn(env.DB)
    await env.DB.prepare('UPDATE files SET upload_status = ?, multipart_upload_id = ? WHERE id = ?')
      .bind('uploading', uploadId, file.id)
      .run()

    return jsonResponse({
      file_id: file.id,
      upload_id: uploadId,
      part_size: PART_SIZE,
      total_parts: Math.ceil(body.size / PART_SIZE),
      r2_config_id: loaded.id,
    })
  } catch (error) {
    return jsonResponse({ error: '初始化分片上传失败' }, 500)
  }
}

export async function presignMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  try {
    const body = await parseJson<{
      file_id: string
      upload_id: string
      part_number: number
    }>(request)

    await ensureFilesMultipartUploadIdColumn(env.DB)
    const file = await env.DB.prepare(
      'SELECT id, owner_id, r2_key, expires_at, upload_status, multipart_upload_id FROM files WHERE id = ?'
    )
      .bind(body.file_id)
      .first()

    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }

    if (isExpired(file.expires_at)) {
      return jsonResponse({ error: '文件已过期' }, 410)
    }

    if (file.upload_status !== 'uploading') {
      return jsonResponse({ error: '分片上传未初始化' }, 400)
    }

    const storedUploadId = String(file.multipart_upload_id || '').trim()
    if (!storedUploadId) {
      return jsonResponse({ error: 'upload_id 缺失' }, 400)
    }
    if (storedUploadId !== String(body.upload_id || '').trim()) {
      return jsonResponse({ error: 'upload_id 不匹配' }, 400)
    }

    const partNumber = Number(body.part_number)
    if (!Number.isFinite(partNumber) || partNumber <= 0) {
      return jsonResponse({ error: 'part_number 无效' }, 400)
    }

    const loaded = await resolveR2ConfigForKey(env, String(file.r2_key))
    if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

    const uploadUrl = await generateMultipartUploadUrl(
      loaded.config,
      String(file.r2_key),
      storedUploadId,
      partNumber,
      3600
    )

    return jsonResponse({
      upload_url: uploadUrl,
      part_number: partNumber,
    })
  } catch (error) {
    return jsonResponse({ error: '生成分片上传 URL 失败' }, 500)
  }
}

export async function completeMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  try {
    const body = await parseJson<{
      file_id: string
      upload_id: string
      parts?: Array<{ part_number: number; etag: string }>
    }>(request)

    await ensureFilesMultipartUploadIdColumn(env.DB)
    const file = await env.DB.prepare(
      'SELECT id, owner_id, filename, r2_key, expires_at, short_code, require_login, upload_status, multipart_upload_id FROM files WHERE id = ?'
    )
      .bind(body.file_id)
      .first()

    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }

    const expiresAt = new Date(String(file.expires_at))
    const expiresAtMs = expiresAt.getTime()
    if (Number.isNaN(expiresAtMs)) {
      return jsonResponse({ error: '文件过期时间无效' }, 500)
    }
    if (Date.now() > expiresAtMs) {
      return jsonResponse({ error: '文件已过期' }, 410)
    }

    if (file.upload_status !== 'uploading') {
      return jsonResponse({ error: '分片上传未初始化' }, 400)
    }

    const storedUploadId = String(file.multipart_upload_id || '').trim()
    if (!storedUploadId) {
      return jsonResponse({ error: 'upload_id 缺失' }, 400)
    }
    if (storedUploadId !== String(body.upload_id || '').trim()) {
      return jsonResponse({ error: 'upload_id 不匹配' }, 400)
    }

    const loaded = await resolveR2ConfigForKey(env, String(file.r2_key))
    if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

    const requestParts = Array.isArray(body.parts) ? body.parts : []
    const parts: Array<{ PartNumber?: number; ETag?: string }> =
      requestParts.length > 0
        ? requestParts
            .map((part) => {
              const partNumber = Number(part.part_number)
              const rawEtag = typeof part.etag === 'string' ? part.etag.trim() : ''
              if (!Number.isFinite(partNumber) || partNumber <= 0 || !rawEtag) {
                return null
              }
              const etag = rawEtag.startsWith('"') ? rawEtag : `"${rawEtag}"`
              return { PartNumber: partNumber, ETag: etag }
            })
            .filter((part): part is { PartNumber: number; ETag: string } => Boolean(part))
        : await listParts(loaded.config, String(file.r2_key), storedUploadId)

    await completeMultipartUpload(loaded.config, String(file.r2_key), storedUploadId, parts)

    await env.DB.prepare(
      'UPDATE files SET upload_status = ?, multipart_upload_id = NULL WHERE id = ?'
    )
      .bind('completed', file.id)
      .run()

    let downloadUrl = `/api/files/${file.id}/download`
    const allowDirect = Number(file.require_login) === 0
    if (allowDirect) {
      try {
        if (!isExpired(file.expires_at)) {
          const ttl = calcDownloadTtlSeconds(file.expires_at)
          downloadUrl = await generateDownloadUrl(
            loaded.config,
            String(file.r2_key),
            String(file.filename),
            ttl
          )
        }
      } catch (error) {
        downloadUrl = `/api/files/${file.id}/download`
      }
    }

    return jsonResponse({
      file_id: file.id,
      download_url: downloadUrl,
      short_url: `/s/${file.short_code}`,
      expires_at: String(file.expires_at),
      r2_config_id: loaded.id,
    })
  } catch (error) {
    return jsonResponse({ error: '完成分片上传失败' }, 500)
  }
}

export async function abortMultipart(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  try {
    const body = await parseJson<{ file_id: string }>(request)
    const fileId = String(body?.file_id || '').trim()
    if (!fileId) {
      return jsonResponse({ error: 'file_id 不能为空' }, 400)
    }

    await ensureFilesMultipartUploadIdColumn(env.DB)
    const file = await env.DB.prepare(
      'SELECT id, owner_id, r2_key, upload_status, multipart_upload_id FROM files WHERE id = ? LIMIT 1'
    )
      .bind(fileId)
      .first()

    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }

    if (file.upload_status !== 'uploading') {
      return jsonResponse({ error: '文件不在分片上传中' }, 400)
    }

    const r2Key = String(file.r2_key)
    const multipartUploadId = String(file.multipart_upload_id || '').trim()
    if (!multipartUploadId) {
      return jsonResponse({ error: 'upload_id 缺失' }, 400)
    }

    const loaded = await resolveR2ConfigForKey(env, r2Key)
    if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

    let queued = false
    try {
      await abortMultipartUpload(loaded.config, r2Key, multipartUploadId)
    } catch (error) {
      const summary = summarizeS3Error(error)
      if (summary.httpStatusCode === 404 || summary.code === 'NoSuchUpload') {
        try {
          await deleteObject(loaded.config, r2Key)
        } catch (deleteError) {
          const deleteSummary = summarizeS3Error(deleteError)
          if (deleteSummary.httpStatusCode !== 404 && deleteSummary.code !== 'NoSuchKey') {
            throw deleteError
          }
        }
      } else {
        queued = true
      }
    }

    const now = new Date().toISOString()
    if (queued) {
      await env.DB.prepare(
        "UPDATE files SET upload_status = 'deleted', deleted_at = ? WHERE id = ?"
      )
        .bind(now, fileId)
        .run()
      await env.DB.prepare(
        'INSERT INTO delete_queue (id, file_id, r2_key, created_at) VALUES (?, ?, ?, ?)'
      )
        .bind(crypto.randomUUID(), fileId, r2Key, now)
        .run()
    } else {
      await env.DB.prepare(
        "UPDATE files SET upload_status = 'deleted', deleted_at = ?, multipart_upload_id = NULL WHERE id = ?"
      )
        .bind(now, fileId)
        .run()
    }

    await logAudit(env.DB, {
      actorUserId: user.id,
      action: 'UPLOAD_ABORT',
      targetType: 'file',
      targetId: fileId,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined,
      metadata: { queued },
    })

    return jsonResponse({ success: true, queued })
  } catch (error) {
    return jsonResponse({ error: '取消分片上传失败' }, 500)
  }
}
