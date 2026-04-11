import type { Env } from '../config/env'
import { getMaxFileSize, getTotalStorage } from '../config/env'
import { jsonResponse, parseJson, getUser, calcPresignedDownloadUrlTtlSeconds } from './utils'
import {
  abortMultipartUpload,
  deleteObject,
  buildR2Key,
  completeMultipartUpload,
  generateDownloadUrl,
  generateMultipartUploadUrl,
  generateUploadUrl,
  getObjectSize,
  initiateMultipartUpload,
  listParts,
  resolveR2ConfigForKey,
  sanitizeFilename,
  summarizeS3Error,
} from '../services/r2'
import { logAudit } from '../services/audit'
import { getClientIp } from '../middleware/rateLimit'
import { getUserUsedSpace } from '../services/quota'
import { ensureFilesMultipartUploadIdColumn } from '../services/dbSchema'
import { generateRandomCode } from '../utils/random'
import {
  isUploadConfigPolicyError,
  resolveUploadConfigForUser,
} from '../services/uploadConfigPolicy'
import { normalizeDeclaredFileSize, validateUploadedObjectSize } from '../services/uploadValidation'

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

const SHORT_CODE_MAX_ATTEMPTS = 10
const FILENAME_RENAME_MAX_ATTEMPTS = 100

function createUploadConfigPolicyErrorResponse(error: unknown): Response | null {
  if (!isUploadConfigPolicyError(error)) {
    return null
  }
  return jsonResponse({ error: error.message }, error.status)
}

async function getUploadConfigQuotaBytes(env: Env, configId: string): Promise<number> {
  const quota = await env.DB.prepare('SELECT quota_bytes FROM r2_configs WHERE id = ? LIMIT 1')
    .bind(configId)
    .first('quota_bytes')
  const quotaBytes = Number(quota)
  if (Number.isFinite(quotaBytes) && quotaBytes > 0) {
    return quotaBytes
  }
  return getTotalStorage(env)
}

async function getUploadConfigUsedSpace(env: Env, configId: string): Promise<number> {
  const prefix = `flares3/${configId}/%`
  const usedSpace = await env.DB.prepare(
    "SELECT COALESCE(SUM(size), 0) AS usedSpace FROM files WHERE upload_status IN ('pending','uploading','completed') AND deleted_at IS NULL AND r2_key LIKE ?"
  )
    .bind(prefix)
    .first('usedSpace')
  const normalized = Number(usedSpace)
  return Number.isFinite(normalized) && normalized > 0 ? normalized : 0
}

async function ensureUploadConfigHasCapacity(
  env: Env,
  configId: string,
  declaredSize: number
): Promise<Response | null> {
  const [quotaBytes, usedSpace] = await Promise.all([
    getUploadConfigQuotaBytes(env, configId),
    getUploadConfigUsedSpace(env, configId),
  ])

  if (usedSpace + declaredSize > quotaBytes) {
    return jsonResponse({ error: '所选存储配置空间不足' }, 413)
  }

  return null
}

function sanitizeUploadFilename(filename: string): string {
  return sanitizeFilename(filename)
}

function splitFilename(filename: string): { stem: string; ext: string } {
  const safe = String(filename || 'file')
  const dotIndex = safe.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === safe.length - 1) {
    return { stem: safe, ext: '' }
  }
  return {
    stem: safe.slice(0, dotIndex),
    ext: safe.slice(dotIndex),
  }
}

function buildRenamedFilename(filename: string, suffix: number): string {
  if (suffix <= 0) return filename
  const { stem, ext } = splitFilename(filename)
  return `${stem}(${suffix})${ext}`
}

function formatD1ErrorMessage(error: unknown): string {
  if (!error) return ''
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  try {
    return JSON.stringify(error)
  } catch {
    return String(error)
  }
}

async function markFileUploadDeleted(env: Env, fileId: string): Promise<void> {
  const now = new Date().toISOString()
  await env.DB.prepare(
    "UPDATE files SET upload_status = 'deleted', deleted_at = ?, multipart_upload_id = NULL WHERE id = ?"
  )
    .bind(now, fileId)
    .run()
}

async function deleteUploadedObjectIfPresent(
  loaded: NonNullable<Awaited<ReturnType<typeof resolveR2ConfigForKey>>>,
  r2Key: string
): Promise<void> {
  try {
    await deleteObject(loaded.config, r2Key)
  } catch (error) {
    const summary = summarizeS3Error(error)
    if (summary.httpStatusCode === 404 || summary.code === 'NoSuchKey') {
      return
    }
    throw error
  }
}

async function verifyUploadedObjectSizeOrReject(
  env: Env,
  file: { id: string; size: number; r2_key: string },
  loaded: NonNullable<Awaited<ReturnType<typeof resolveR2ConfigForKey>>>,
  auditContext?: {
    actorUserId?: string
    ip?: string
    userAgent?: string
    stage: 'confirm_upload' | 'complete_multipart'
  }
): Promise<{ actualSize: number } | { response: Response }> {
  const actualSize = await getObjectSize(loaded.config, String(file.r2_key))
  if (actualSize === null) {
    return {
      response: jsonResponse({ error: '上传对象不存在或尚未完成' }, 409),
    }
  }

  const expectedSize = Number(file.size)
  const validation = validateUploadedObjectSize(expectedSize, actualSize)
  if (validation.ok) {
    return { actualSize }
  }

  await deleteUploadedObjectIfPresent(loaded, String(file.r2_key))
  await markFileUploadDeleted(env, String(file.id))

  if (validation.reason === 'SIZE_MISMATCH' && auditContext) {
    await Promise.allSettled([
      logAudit(env.DB, {
        actorUserId: auditContext.actorUserId,
        action: 'UPLOAD_SIZE_MISMATCH',
        targetType: 'file',
        targetId: String(file.id),
        ip: auditContext.ip,
        userAgent: auditContext.userAgent,
        metadata: {
          stage: auditContext.stage,
          expected_size: expectedSize,
          actual_size: actualSize,
        },
      }),
    ])
  }

  if (validation.reason === 'INVALID_ACTUAL_SIZE') {
    return {
      response: jsonResponse({ error: '上传对象大小无效' }, 502),
    }
  }

  return {
    response: jsonResponse({ error: '上传对象大小与声明大小不一致' }, 409),
  }
}

function isUniqueConstraintError(errorMessage: string, field: 'r2_key' | 'short_code'): boolean {
  const normalized = String(errorMessage || '').toLowerCase()
  if (!normalized.includes('unique constraint failed')) return false
  return normalized.includes(`files.${field}`) || normalized.includes(field)
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
): Promise<{ id: string; r2Key: string; shortCode: string; expiresAt: Date; filename: string }> {
  const id = crypto.randomUUID()
  const baseFilename = sanitizeUploadFilename(filename)
  const expiresAt = calcExpiresAt(expiresIn)

  for (let suffix = 0; suffix < FILENAME_RENAME_MAX_ATTEMPTS; suffix += 1) {
    const resolvedFilename = buildRenamedFilename(baseFilename, suffix)
    const r2Key = buildR2Key(r2ConfigId, resolvedFilename)

    const occupied = await env.DB.prepare('SELECT id FROM files WHERE r2_key = ? LIMIT 1')
      .bind(r2Key)
      .first('id')
    if (occupied) {
      continue
    }

    for (let i = 0; i < SHORT_CODE_MAX_ATTEMPTS; i += 1) {
      const shortCode = generateRandomCode(6)
      const now = new Date().toISOString()
      const result = await env.DB.prepare(
        `INSERT INTO files (id, owner_id, filename, r2_key, size, content_type, expires_in, created_at, expires_at, upload_status, short_code, require_login)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`
      )
        .bind(
          id,
          userId,
          resolvedFilename,
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
        return { id, r2Key, shortCode, expiresAt, filename: resolvedFilename }
      }

      const errorMessage = formatD1ErrorMessage(result.error)
      if (isUniqueConstraintError(errorMessage, 'r2_key')) {
        break
      }
      if (isUniqueConstraintError(errorMessage, 'short_code')) {
        continue
      }

      throw new Error(errorMessage || 'create_file_record_failed')
    }
  }

  throw new Error('filename_conflict_unresolved')
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

    const declaredSize = normalizeDeclaredFileSize(body.size)
    if (!body.filename || declaredSize === null) {
      return jsonResponse({ error: '无效的请求' }, 400)
    }
    const expiresIn = normalizeExpiresIn(body.expires_in)

    const maxSize = getMaxFileSize(env)
    if (declaredSize > maxSize) {
      return jsonResponse({ error: '文件大小超过限制' }, 413)
    }

    const used = await getUserUsedSpace(env.DB, user.id)
    if (used + declaredSize > user.quota_bytes) {
      return jsonResponse({ error: '超出配额' }, 413)
    }

    let loaded
    try {
      loaded = await resolveUploadConfigForUser(env, user, body.config_id)
    } catch (error) {
      const response = createUploadConfigPolicyErrorResponse(error)
      if (response) return response
      throw error
    }

    if (!loaded) {
      if (body.config_id) return jsonResponse({ error: '配置不存在或不可用' }, 404)
      return jsonResponse({ error: 'R2 未配置' }, 503)
    }

    const quotaResponse = await ensureUploadConfigHasCapacity(env, loaded.id, declaredSize)
    if (quotaResponse) {
      return quotaResponse
    }

    const contentType = body.content_type || 'application/octet-stream'
    const requireLogin = body.require_login !== false
    const file = await createFileRecord(
      env,
      user.id,
      body.filename,
      declaredSize,
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
      filename: file.filename,
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
      'SELECT id, owner_id, filename, r2_key, expires_at, short_code, require_login, size FROM files WHERE id = ? LIMIT 1'
    )
      .bind(body.file_id)
      .first()

    if (!file || file.owner_id !== user.id) {
      return jsonResponse({ error: '文件不存在' }, 404)
    }

    const r2Key = String(file.r2_key)
    const loaded = await resolveR2ConfigForKey(env, r2Key)
    if (!loaded) return jsonResponse({ error: 'R2 未配置' }, 503)

    const sizeValidation = await verifyUploadedObjectSizeOrReject(
      env,
      {
        id: String(file.id),
        size: Number(file.size),
        r2_key: r2Key,
      },
      loaded,
      {
        actorUserId: user.id,
        ip: getClientIp(request),
        userAgent: request.headers.get('User-Agent') || undefined,
        stage: 'confirm_upload',
      }
    )
    if ('response' in sizeValidation) {
      return sizeValidation.response
    }

    await env.DB.prepare('UPDATE files SET size = ?, upload_status = ? WHERE id = ?')
      .bind(sizeValidation.actualSize, 'completed', body.file_id)
      .run()

    let downloadUrl = `/api/files/${body.file_id}/download`
    const allowDirect = Number(file.require_login) === 0
    if (allowDirect) {
      try {
        if (!isExpired(file.expires_at)) {
          const ttl = calcDownloadTtlSeconds(file.expires_at)
          downloadUrl = await generateDownloadUrl(loaded.config, r2Key, String(file.filename), ttl)
        }
      } catch (error) {
        downloadUrl = `/api/files/${body.file_id}/download`
      }
    }

    return jsonResponse({
      success: true,
      filename: String(file.filename),
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

    const declaredSize = normalizeDeclaredFileSize(body.size)
    if (!body.filename || declaredSize === null) {
      return jsonResponse({ error: '无效的请求' }, 400)
    }
    const expiresIn = normalizeExpiresIn(body.expires_in)

    const maxSize = getMaxFileSize(env)
    if (declaredSize > maxSize) {
      return jsonResponse({ error: '文件大小超过限制' }, 413)
    }

    const used = await getUserUsedSpace(env.DB, user.id)
    if (used + declaredSize > user.quota_bytes) {
      return jsonResponse({ error: '超出配额' }, 413)
    }

    let loaded
    try {
      loaded = await resolveUploadConfigForUser(env, user, body.config_id)
    } catch (error) {
      const response = createUploadConfigPolicyErrorResponse(error)
      if (response) return response
      throw error
    }

    if (!loaded) {
      if (body.config_id) return jsonResponse({ error: '配置不存在或不可用' }, 404)
      return jsonResponse({ error: 'R2 未配置' }, 503)
    }

    const quotaResponse = await ensureUploadConfigHasCapacity(env, loaded.id, declaredSize)
    if (quotaResponse) {
      return quotaResponse
    }

    const contentType = body.content_type || 'application/octet-stream'
    const requireLogin = body.require_login !== false
    const file = await createFileRecord(
      env,
      user.id,
      body.filename,
      declaredSize,
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
      filename: file.filename,
      upload_id: uploadId,
      part_size: PART_SIZE,
      total_parts: Math.ceil(declaredSize / PART_SIZE),
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
      'SELECT id, owner_id, filename, r2_key, expires_at, short_code, require_login, upload_status, multipart_upload_id, size FROM files WHERE id = ?'
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

    const sizeValidation = await verifyUploadedObjectSizeOrReject(
      env,
      {
        id: String(file.id),
        size: Number(file.size),
        r2_key: String(file.r2_key),
      },
      loaded,
      {
        actorUserId: user.id,
        ip: getClientIp(request),
        userAgent: request.headers.get('User-Agent') || undefined,
        stage: 'complete_multipart',
      }
    )
    if ('response' in sizeValidation) {
      return sizeValidation.response
    }

    await env.DB.prepare(
      'UPDATE files SET size = ?, upload_status = ?, multipart_upload_id = NULL WHERE id = ?'
    )
      .bind(sizeValidation.actualSize, 'completed', file.id)
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
      filename: String(file.filename),
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
