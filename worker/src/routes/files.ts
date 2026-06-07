import type { Env } from '../config/env'
import { jsonResponse, getUser, calcPresignedDownloadUrlTtlSeconds, redirect } from './utils'
import {
  checkObjectExists,
  extractR2ConfigIdFromKey,
  generateDownloadUrl,
  generatePreviewUrl,
  resolveR2ConfigForKey,
} from '../services/r2'
import { logAudit, prepareAuditLogInsert } from '../services/audit'
import { createProvider } from '../services/storage/factory'
import { prepareEnqueueFileDeletionIfNeeded } from '../services/deleteQueue'
import { getClientIp } from '../middleware/rateLimit'
import { prepareReleaseUploadReservation } from '../services/uploadReservations'
import {
  MAX_PREVIEW_RESPONSE_BYTES,
  limitedPreviewResponse,
  readBoundedResponseText,
} from '../services/previewResponsePolicy'
import {
  measureRouteStep,
  withRouteTimingHeaders,
  type RouteTimingEntry,
} from '../utils/routeTiming'

const ALLOWED_SORT_FIELDS: Record<string, string> = {
  created_at: 'f.created_at',
  filename: 'f.filename',
  size: 'f.size',
  expires_at: 'f.expires_at',
}

const TRASH_SORT_FIELDS: Record<string, string> = {
  ...ALLOWED_SORT_FIELDS,
  deleted_at: 'f.deleted_at',
}

function parseSortParams(
  url: URL,
  fields: Record<string, string>,
  defaultField: string
): { sortColumn: string; sortDir: 'ASC' | 'DESC' } {
  const sortByRaw = url.searchParams.get('sort_by') || defaultField
  const sortOrderRaw = url.searchParams.get('sort_order') || 'desc'
  const sortColumn = fields[sortByRaw] || fields[defaultField]
  const sortDir = sortOrderRaw === 'asc' ? 'ASC' : 'DESC'
  return { sortColumn, sortDir }
}

function formatDuration(ms: number): string {
  if (ms < 0) return '已过期'
  const minutes = Math.floor(ms / 60000)
  const hours = Math.floor(minutes / 60)
  const days = Math.floor(hours / 24)
  const remHours = hours % 24
  const remMinutes = minutes % 60
  if (days > 0) return `${days}天 ${remHours}小时 ${remMinutes}分钟`
  if (hours > 0) return `${hours}小时 ${remMinutes}分钟`
  return `${remMinutes}分钟`
}

function getExplicitProviderConfigId(file: {
  r2_key?: unknown
  config_id?: unknown
}): string | null {
  const configId = String(file.config_id || '').trim()
  if (!configId) return null
  return extractR2ConfigIdFromKey(String(file.r2_key || '')) ? null : configId
}

export async function listFiles(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const timings: RouteTimingEntry[] = []

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  const scope = url.searchParams.get('scope')
  const filename = url.searchParams.get('filename')
  const ownerId = url.searchParams.get('owner_id')
  const uploadStatus = url.searchParams.get('upload_status')
  const createdFrom = url.searchParams.get('created_from')
  const createdTo = url.searchParams.get('created_to')
  const offset = (page - 1) * limit

  const conditions: string[] = [
    "f.upload_status IN ('completed','deleted')",
    'f.deleted_at IS NULL',
  ]
  const params: unknown[] = []
  if (user.role !== 'admin' || scope === 'mine') {
    conditions.push('f.owner_id = ?')
    params.push(user.id)
  } else if (ownerId) {
    conditions.push('f.owner_id = ?')
    params.push(ownerId)
  }
  if (filename && filename.trim()) {
    conditions.push('f.filename LIKE ?')
    params.push(`%${filename.trim()}%`)
  }
  if (uploadStatus) {
    conditions.push('f.upload_status = ?')
    params.push(uploadStatus)
  }
  if (createdFrom) {
    conditions.push('f.created_at >= ?')
    params.push(createdFrom)
  }
  if (createdTo) {
    conditions.push('f.created_at < ?')
    params.push(createdTo)
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const { sortColumn, sortDir } = parseSortParams(url, ALLOWED_SORT_FIELDS, 'created_at')

  const [totalRow, rows] = await Promise.all([
    measureRouteStep(timings, 'dbCount', () =>
      env.DB.prepare(`SELECT COUNT(*) AS total FROM files f ${whereClause}`)
        .bind(...params)
        .first('total')
    ),
    measureRouteStep(timings, 'dbRows', () =>
      env.DB.prepare(
        `SELECT f.id, f.owner_id, u.username AS owner_username, f.filename, f.r2_key, f.size, f.content_type, f.expires_in, f.created_at, f.expires_at, f.upload_status, f.short_code, f.require_login, f.config_id
         FROM files f
         LEFT JOIN users u ON u.id = f.owner_id
         ${whereClause}
         ORDER BY ${sortColumn} ${sortDir}
         LIMIT ? OFFSET ?`
      )
        .bind(...params, limit, offset)
        .all()
    ),
  ])
  const total = Number(totalRow || 0)

  const now = Date.now()
  const filesWithUrl = await measureRouteStep(timings, 'postProcess', () =>
    Promise.all(
      (rows.results || []).map(async (row) => {
        const expiresAt = new Date(String(row.expires_at)).getTime()
        const remaining = Number.isFinite(expiresAt) ? formatDuration(expiresAt - now) : '未知'
        let downloadUrl = ''
        const allowDirect = Number(row.require_login) === 0

        if (
          allowDirect &&
          row.upload_status === 'completed' &&
          Number.isFinite(expiresAt) &&
          now < expiresAt
        ) {
          const explicitProviderConfigId = getExplicitProviderConfigId(row)
          if (explicitProviderConfigId) {
            downloadUrl = `/api/files/${row.id}/download`
          } else {
            const loaded = await resolveR2ConfigForKey(env, String(row.r2_key))
            if (loaded) {
              try {
                const ttl = calcPresignedDownloadUrlTtlSeconds(new Date(expiresAt), now)
                downloadUrl = await generateDownloadUrl(
                  loaded.config,
                  String(row.r2_key),
                  String(row.filename),
                  ttl
                )
              } catch (error) {
                downloadUrl = `/api/files/${row.id}/download`
              }
            } else {
              downloadUrl = `/api/files/${row.id}/download`
            }
          }
        }

        const r2ConfigId =
          extractR2ConfigIdFromKey(String(row.r2_key)) || String((row as any).config_id || '')

        return {
          ...row,
          r2_config_id: r2ConfigId,
          remaining_time: remaining,
          download_url: downloadUrl,
        }
      })
    )
  )

  return withRouteTimingHeaders(
    jsonResponse({
      total,
      page,
      limit,
      files: filesWithUrl,
    }),
    timings
  )
}

export async function listTrashFiles(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)
  const timings: RouteTimingEntry[] = []

  const url = new URL(request.url)
  const page = Math.max(1, Number(url.searchParams.get('page') || 1))
  const limit = Math.min(100, Math.max(1, Number(url.searchParams.get('limit') || 20)))
  const scope = url.searchParams.get('scope')
  const filename = url.searchParams.get('filename')
  const ownerId = url.searchParams.get('owner_id')
  const deletedFrom = url.searchParams.get('deleted_from')
  const deletedTo = url.searchParams.get('deleted_to')
  const offset = (page - 1) * limit

  const conditions: string[] = ["f.upload_status = 'deleted'", 'f.deleted_at IS NOT NULL']
  const params: unknown[] = []

  if (user.role !== 'admin' || scope === 'mine') {
    conditions.push('f.owner_id = ?')
    params.push(user.id)
  } else if (ownerId) {
    conditions.push('f.owner_id = ?')
    params.push(ownerId)
  }

  if (filename && filename.trim()) {
    conditions.push('f.filename LIKE ?')
    params.push(`%${filename.trim()}%`)
  }

  if (deletedFrom) {
    conditions.push('f.deleted_at >= ?')
    params.push(deletedFrom)
  }
  if (deletedTo) {
    conditions.push('f.deleted_at < ?')
    params.push(deletedTo)
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`
  const { sortColumn, sortDir } = parseSortParams(url, TRASH_SORT_FIELDS, 'deleted_at')

  const [totalRow, rows] = await Promise.all([
    measureRouteStep(timings, 'dbCount', () =>
      env.DB.prepare(`SELECT COUNT(*) AS total FROM files f ${whereClause}`)
        .bind(...params)
        .first('total')
    ),
    measureRouteStep(timings, 'dbRows', () =>
      env.DB.prepare(
        `SELECT f.id, f.owner_id, u.username AS owner_username, f.filename, f.r2_key, f.size, f.content_type, f.expires_in, f.created_at, f.expires_at, f.upload_status, f.short_code, f.require_login, f.deleted_at, f.config_id
         FROM files f
         LEFT JOIN users u ON u.id = f.owner_id
         ${whereClause}
         ORDER BY ${sortColumn} ${sortDir}
         LIMIT ? OFFSET ?`
      )
        .bind(...params, limit, offset)
        .all()
    ),
  ])
  const total = Number(totalRow || 0)

  const files = await measureRouteStep(timings, 'postProcess', async () =>
    (rows.results || []).map((row) => ({
      ...row,
      r2_config_id:
        extractR2ConfigIdFromKey(String(row.r2_key)) || String((row as any).config_id || ''),
      remaining_time: '-',
      download_url: '',
    }))
  )

  return withRouteTimingHeaders(
    jsonResponse({
      total,
      page,
      limit,
      files,
    }),
    timings
  )
}

export async function downloadFile(request: Request, env: Env, fileId: string): Promise<Response> {
  const file = await env.DB.prepare(
    `SELECT f.id, f.owner_id, f.filename, f.r2_key, f.expires_at, f.upload_status, f.require_login, f.config_id,
            u.status AS owner_status
     FROM files f
     LEFT JOIN users u ON u.id = f.owner_id
     WHERE f.id = ?
     LIMIT 1`
  )
    .bind(fileId)
    .first()
  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (String((file as any).owner_status || '') !== 'active') {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (file.upload_status !== 'completed') {
    return jsonResponse({ error: '文件未完成上传' }, 400)
  }
  const expiresAt = new Date(String(file.expires_at))
  const expiresAtMs = expiresAt.getTime()
  if (Number.isNaN(expiresAtMs)) {
    return jsonResponse({ error: '文件过期时间无效' }, 500)
  }
  if (Date.now() > expiresAtMs) {
    return jsonResponse({ error: '文件已过期' }, 410)
  }

  const user = getUser(request)
  const requireLogin = Number(file.require_login) === 1
  if (requireLogin && !user) {
    const next = encodeURIComponent(`/api/files/${fileId}/download`)
    return redirect(`/login?next=${next}`, 302)
  }

  // require_login=1：仅允许 owner / admin 直接下载；其他用户必须通过分享链接下载
  if (requireLogin && user && user.role !== 'admin' && String(file.owner_id) !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }

  const r2Key = String(file.r2_key)
  const explicitProviderConfigId = getExplicitProviderConfigId(file)
  if (explicitProviderConfigId) {
    const provider = await createProvider(env, explicitProviderConfigId)
    if (!provider) return jsonResponse({ error: '存储配置未找到' }, 503)

    try {
      const result = await provider.download(r2Key, String(file.filename), 3600)

      await logAudit(env.DB, {
        actorUserId: user?.id,
        action: 'FILE_DOWNLOAD',
        targetType: 'file',
        targetId: fileId,
        ip: getClientIp(request),
        userAgent: request.headers.get('User-Agent') || undefined,
        metadata: { require_login: Number(file.require_login) },
      })

      if (result.kind === 'redirect') {
        return redirect(result.url, 302)
      }
      return result.response
    } catch (error) {
      return jsonResponse({ error: `文件下载失败：${formatUpstreamFetchError(error)}` }, 502)
    }
  }

  const loaded = await resolveR2ConfigForKey(env, r2Key)

  if (loaded) {
    const ttl = calcPresignedDownloadUrlTtlSeconds(expiresAt)
    const downloadUrl = await generateDownloadUrl(loaded.config, r2Key, String(file.filename), ttl)

    await logAudit(env.DB, {
      actorUserId: user?.id,
      action: 'FILE_DOWNLOAD',
      targetType: 'file',
      targetId: fileId,
      ip: getClientIp(request),
      userAgent: request.headers.get('User-Agent') || undefined,
      metadata: { require_login: Number(file.require_login) },
    })

    return redirect(downloadUrl, 302)
  }

  return jsonResponse({ error: '存储配置未找到' }, 503)
}

const ARCHIVE_MIME_TYPES = new Set([
  'application/zip',
  'application/x-zip-compressed',
  'application/x-7z-compressed',
  'application/x-rar-compressed',
  'application/vnd.rar',
  'application/x-tar',
  'application/gzip',
  'application/x-gzip',
  'application/x-bzip2',
  'application/x-xz',
])

const ARCHIVE_EXTENSIONS = new Set(['zip', 'rar', '7z', 'tar', 'gz', 'tgz', 'bz2', 'xz'])

function normalizeContentType(value: unknown): string {
  return String(value || '')
    .split(';')[0]
    .trim()
    .toLowerCase()
}

function getFilenameExtension(filename: unknown): string {
  const name = String(filename || '').trim()
  const index = name.lastIndexOf('.')
  if (index <= 0 || index === name.length - 1) return ''
  return name.slice(index + 1).toLowerCase()
}

function isArchiveFile(contentType: string, extension: string): boolean {
  if (contentType && ARCHIVE_MIME_TYPES.has(contentType)) return true
  if (extension && ARCHIVE_EXTENSIONS.has(extension)) return true
  return false
}

function formatUpstreamFetchError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '')
  const message = raw.replace(/\s+/g, ' ').trim()
  if (!message) return 'upstream_fetch_failed'
  return message.slice(0, 200)
}

function resolvePreviewMode(
  contentType: string,
  extension: string
):
  | { kind: 'redirect'; responseContentType: string }
  | { kind: 'proxy'; responseContentType: string }
  | null {
  if (contentType === 'application/pdf' || extension === 'pdf') {
    return { kind: 'redirect', responseContentType: 'application/pdf' }
  }

  if (contentType.startsWith('image/')) {
    return { kind: 'redirect', responseContentType: contentType }
  }

  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp', 'svg'].includes(extension)) {
    const map: Record<string, string> = {
      png: 'image/png',
      jpg: 'image/jpeg',
      jpeg: 'image/jpeg',
      gif: 'image/gif',
      webp: 'image/webp',
      bmp: 'image/bmp',
      svg: 'image/svg+xml',
    }
    return { kind: 'redirect', responseContentType: map[extension] || 'image/*' }
  }

  if (
    contentType === 'text/markdown' ||
    contentType === 'text/x-markdown' ||
    extension === 'md' ||
    extension === 'markdown'
  ) {
    return { kind: 'proxy', responseContentType: 'text/markdown; charset=utf-8' }
  }

  if (
    contentType.startsWith('text/') ||
    ['txt', 'log', 'csv', 'json', 'yml', 'yaml', 'ini', 'conf'].includes(extension)
  )
    return { kind: 'proxy', responseContentType: 'text/plain; charset=utf-8' }

  return null
}

export async function previewFile(request: Request, env: Env, fileId: string): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  const file = await env.DB.prepare(
    `SELECT id, owner_id, filename, r2_key, content_type, expires_at, upload_status, config_id FROM files WHERE id = ? LIMIT 1`
  )
    .bind(fileId)
    .first()

  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (user.role !== 'admin' && file.owner_id !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }
  if (file.upload_status !== 'completed') {
    return jsonResponse({ error: '文件未完成上传' }, 400)
  }

  const expiresAt = new Date(String(file.expires_at))
  const expiresAtMs = expiresAt.getTime()
  if (Number.isNaN(expiresAtMs)) {
    return jsonResponse({ error: '文件过期时间无效' }, 500)
  }
  if (Date.now() > expiresAtMs) {
    return jsonResponse({ error: '文件已过期' }, 410)
  }

  const contentType = normalizeContentType(file.content_type)
  const extension = getFilenameExtension(file.filename)
  if (isArchiveFile(contentType, extension)) {
    return jsonResponse({ error: '不支持预览压缩包' }, 415)
  }

  const mode = resolvePreviewMode(contentType, extension)
  if (!mode) {
    return jsonResponse({ error: '不支持预览该文件类型' }, 415)
  }

  const r2Key = String(file.r2_key)
  const explicitProviderConfigId = getExplicitProviderConfigId(file)
  if (explicitProviderConfigId) {
    const provider = await createProvider(env, explicitProviderConfigId)
    if (!provider) return jsonResponse({ error: '存储配置未找到' }, 503)

    try {
      const result = await provider.preview(
        r2Key,
        String(file.filename),
        600,
        mode.kind === 'redirect' ? mode.responseContentType : undefined
      )
      if (result.kind === 'redirect') {
        return redirect(result.url, 302)
      }
      return limitedPreviewResponse(result.response, mode.responseContentType)
    } catch (error) {
      return jsonResponse({ error: `生成预览链接失败：${formatUpstreamFetchError(error)}` }, 502)
    }
  }

  const loaded = await resolveR2ConfigForKey(env, r2Key)
  if (!loaded) return jsonResponse({ error: '存储配置未找到' }, 503)

  const ttl = calcPresignedDownloadUrlTtlSeconds(expiresAt)
  let previewUrl = ''
  try {
    previewUrl = await generatePreviewUrl(
      loaded.config,
      String(file.r2_key),
      String(file.filename),
      ttl,
      mode.kind === 'redirect' ? mode.responseContentType : undefined
    )
  } catch (error) {
    return jsonResponse({ error: `生成预览链接失败：${formatUpstreamFetchError(error)}` }, 502)
  }

  if (mode.kind === 'redirect') {
    return redirect(previewUrl, 302)
  }

  let response: Response
  try {
    response = await fetch(previewUrl, {
      headers: {
        Range: `bytes=0-${MAX_PREVIEW_RESPONSE_BYTES - 1}`,
      },
    })
  } catch (error) {
    return jsonResponse({ error: `预览内容获取失败：${formatUpstreamFetchError(error)}` }, 502)
  }
  if (response.status === 416) {
    try {
      response = await fetch(previewUrl)
    } catch (error) {
      return jsonResponse({ error: `预览内容获取失败：${formatUpstreamFetchError(error)}` }, 502)
    }
  }
  if (!response.ok) {
    const text = await readBoundedResponseText(response).catch(() => '')
    return jsonResponse({ error: text || '预览内容获取失败' }, response.status || 502)
  }

  return limitedPreviewResponse(response, mode.responseContentType)
}

export async function restoreFile(request: Request, env: Env, fileId: string): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  const file = await env.DB.prepare(
    'SELECT id, owner_id, r2_key, expires_at, upload_status, deleted_at, config_id FROM files WHERE id = ? LIMIT 1'
  )
    .bind(fileId)
    .first()

  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (user.role !== 'admin' && file.owner_id !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }
  if (file.upload_status !== 'deleted' || !file.deleted_at) {
    return jsonResponse({ error: '文件不在回收站' }, 400)
  }

  const expiresAt = new Date(String(file.expires_at)).getTime()
  if (!Number.isFinite(expiresAt) || Date.now() > expiresAt) {
    return jsonResponse({ error: '文件已过期，无法恢复' }, 410)
  }

  const r2Key = String(file.r2_key)
  const explicitProviderConfigId = getExplicitProviderConfigId(file)
  if (explicitProviderConfigId) {
    const provider = await createProvider(env, explicitProviderConfigId)
    if (!provider) return jsonResponse({ error: '存储配置未找到' }, 503)

    const exists = await provider.checkExists(r2Key)
    if (!exists) {
      return jsonResponse({ error: '文件对象不存在，无法恢复' }, 409)
    }

    const now = new Date().toISOString()
    await env.DB.batch([
      env.DB.prepare(
        "UPDATE files SET upload_status = 'completed', deleted_at = NULL, multipart_upload_id = NULL WHERE id = ?"
      ).bind(fileId),
      prepareReleaseUploadReservation(env.DB, fileId, now),
      prepareAuditLogInsert(
        env.DB,
        {
          actorUserId: user.id,
          action: 'FILE_RESTORE',
          targetType: 'file',
          targetId: fileId,
          ip: getClientIp(request),
          userAgent: request.headers.get('User-Agent') || undefined,
        },
        now
      ),
    ])
    return jsonResponse({ success: true })
  }

  const loaded = await resolveR2ConfigForKey(env, r2Key)
  if (!loaded) return jsonResponse({ error: '存储配置未找到' }, 503)

  const now = new Date().toISOString()
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE files SET upload_status = 'completed', deleted_at = NULL, multipart_upload_id = NULL WHERE id = ?"
    ).bind(fileId),
    env.DB.prepare(
      'UPDATE delete_queue SET processed_at = ? WHERE file_id = ? AND processed_at IS NULL'
    ).bind(now, fileId),
    prepareAuditLogInsert(
      env.DB,
      {
        actorUserId: user.id,
        action: 'FILE_RESTORE',
        targetType: 'file',
        targetId: fileId,
        ip: getClientIp(request),
        userAgent: request.headers.get('User-Agent') || undefined,
      },
      now
    ),
  ])

  return jsonResponse({ success: true })
}

export async function permanentlyDeleteTrashFiles(request: Request, env: Env): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  const { results } = await env.DB.prepare(
    `SELECT id, owner_id, r2_key, upload_status, deleted_at, config_id
     FROM files
     WHERE owner_id = ? AND upload_status = 'deleted' AND deleted_at IS NOT NULL`
  )
    .bind(user.id)
    .all()

  const files = results || []
  const now = new Date().toISOString()
  const ip = getClientIp(request)
  const userAgent = request.headers.get('User-Agent') || undefined
  let deleted = 0
  let queued = 0

  for (const file of files) {
    const fileId = String(file.id)
    const r2Key = String(file.r2_key)
    const explicitProviderConfigId = getExplicitProviderConfigId(file)

    if (explicitProviderConfigId) {
      const provider = await createProvider(env, explicitProviderConfigId)
      if (!provider) return jsonResponse({ error: '存储配置未找到' }, 503)

      try {
        await provider.delete(r2Key)
      } catch {
        // 远端文件可能已不存在，永久删除继续清理本地记录。
      }

      const batchResults = await env.DB.batch([
        prepareReleaseUploadReservation(env.DB, fileId, now),
        env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId),
        prepareAuditLogInsert(
          env.DB,
          {
            actorUserId: user.id,
            action: 'FILE_DELETE_PERMANENT',
            targetType: 'file',
            targetId: fileId,
            ip,
            userAgent,
          },
          now
        ),
      ])
      deleted += Number(batchResults?.[1]?.meta?.changes || 0)
      continue
    }

    const [queueInsertResult] = await env.DB.batch([
      prepareEnqueueFileDeletionIfNeeded(env.DB, { id: fileId, r2_key: r2Key }, now),
      prepareAuditLogInsert(
        env.DB,
        {
          actorUserId: user.id,
          action: 'FILE_DELETE_PERMANENT',
          targetType: 'file',
          targetId: fileId,
          ip,
          userAgent,
        },
        now
      ),
    ])
    queued += Number(queueInsertResult?.meta?.changes || 0)
  }

  return jsonResponse({ success: true, deleted, queued, total: files.length })
}

export async function permanentlyDeleteFile(
  request: Request,
  env: Env,
  fileId: string
): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  const file = await env.DB.prepare(
    'SELECT id, owner_id, r2_key, upload_status, deleted_at, config_id FROM files WHERE id = ? LIMIT 1'
  )
    .bind(fileId)
    .first()

  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (user.role !== 'admin' && file.owner_id !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }
  if (file.upload_status !== 'deleted' || !file.deleted_at) {
    return jsonResponse({ error: '请先将文件移入回收站' }, 400)
  }

  const now = new Date().toISOString()
  const r2Key = String(file.r2_key)
  const explicitProviderConfigId = getExplicitProviderConfigId(file)

  if (explicitProviderConfigId) {
    const provider = await createProvider(env, explicitProviderConfigId)
    if (!provider) return jsonResponse({ error: '存储配置未找到' }, 503)

    try {
      await provider.delete(r2Key)
    } catch {
      // 远端文件可能已不存在，永久删除继续清理本地记录。
    }

    await env.DB.batch([
      prepareReleaseUploadReservation(env.DB, fileId, now),
      env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId),
      prepareAuditLogInsert(
        env.DB,
        {
          actorUserId: user.id,
          action: 'FILE_DELETE_PERMANENT',
          targetType: 'file',
          targetId: fileId,
          ip: getClientIp(request),
          userAgent: request.headers.get('User-Agent') || undefined,
        },
        now
      ),
    ])

    return jsonResponse({ success: true, queued: false })
  }

  const [queueInsertResult] = await env.DB.batch([
    prepareEnqueueFileDeletionIfNeeded(env.DB, { id: fileId, r2_key: r2Key }, now),
    prepareAuditLogInsert(
      env.DB,
      {
        actorUserId: user.id,
        action: 'FILE_DELETE_PERMANENT',
        targetType: 'file',
        targetId: fileId,
        ip: getClientIp(request),
        userAgent: request.headers.get('User-Agent') || undefined,
      },
      now
    ),
  ])
  const queued = Number(queueInsertResult?.meta?.changes || 0) > 0

  return jsonResponse({ success: true, queued })
}

export async function deleteFile(request: Request, env: Env, fileId: string): Promise<Response> {
  const user = getUser(request)
  if (!user) return jsonResponse({ error: '未授权' }, 401)

  const file = await env.DB.prepare(
    'SELECT id, owner_id, upload_status, deleted_at FROM files WHERE id = ? LIMIT 1'
  )
    .bind(fileId)
    .first()

  if (!file) {
    return jsonResponse({ error: '文件不存在' }, 404)
  }
  if (user.role !== 'admin' && file.owner_id !== user.id) {
    return jsonResponse({ error: '无权限' }, 403)
  }
  if (file.upload_status === 'deleted' || file.deleted_at) {
    return jsonResponse({ error: '文件已在回收站' }, 400)
  }

  const now = new Date().toISOString()
  await env.DB.batch([
    env.DB.prepare(
      "UPDATE files SET upload_status = 'deleted', deleted_at = ?, multipart_upload_id = NULL WHERE id = ?"
    ).bind(now, fileId),
    prepareReleaseUploadReservation(env.DB, fileId, now),
    prepareAuditLogInsert(
      env.DB,
      {
        actorUserId: user.id,
        action: 'FILE_DELETE',
        targetType: 'file',
        targetId: fileId,
        ip: getClientIp(request),
        userAgent: request.headers.get('User-Agent') || undefined,
        metadata: { recycleBin: true },
      },
      now
    ),
  ])

  return jsonResponse({ success: true, queued: false, recycled: true })
}
