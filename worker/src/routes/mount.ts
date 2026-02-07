import type { Env } from '../config/env'
import { jsonResponse, redirect } from './utils'
import {
  generateDownloadUrl,
  generatePreviewUrl,
  listObjectsV2,
  loadR2ConfigById,
  summarizeS3Error,
} from '../services/r2'

function normalizePrefix(value: string | null): string {
  const prefix = String(value ?? '').trim()
  return prefix
}

function normalizeToken(value: string | null): string | null {
  const token = String(value ?? '').trim()
  return token ? token : null
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  const num = Number(value)
  if (!Number.isFinite(num)) return fallback
  return Math.min(max, Math.max(min, Math.floor(num)))
}

function getBasename(key: string): string {
  const normalized = String(key ?? '')
  const idx = normalized.lastIndexOf('/')
  return idx >= 0 ? normalized.slice(idx + 1) : normalized
}

function getFilenameExtension(filename: string): string {
  const name = String(filename || '').trim()
  const index = name.lastIndexOf('.')
  if (index <= 0 || index === name.length - 1) return ''
  return name.slice(index + 1).toLowerCase()
}

type PreviewMode =
  | { kind: 'redirect'; responseContentType: string }
  | { kind: 'proxy'; responseContentType: string }

function resolvePreviewModeByExtension(extension: string): PreviewMode | null {
  if (extension === 'pdf') {
    return { kind: 'redirect', responseContentType: 'application/pdf' }
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

  if (extension === 'md' || extension === 'markdown') {
    return { kind: 'proxy', responseContentType: 'text/markdown; charset=utf-8' }
  }

  if (['txt', 'log', 'csv', 'json', 'yml', 'yaml', 'ini', 'conf'].includes(extension)) {
    return { kind: 'proxy', responseContentType: 'text/plain; charset=utf-8' }
  }

  return null
}

function formatListError(error: unknown): { status: number; message: string } {
  const summary = summarizeS3Error(error)
  const parts = [
    summary.code,
    typeof summary.httpStatusCode === 'number' ? `HTTP ${summary.httpStatusCode}` : null,
    summary.message,
  ].filter(Boolean)

  if (!parts.length) {
    return { status: 502, message: '读取对象列表失败' }
  }

  return { status: 502, message: `读取对象列表失败（${parts.join(' / ')}）` }
}

function formatUpstreamFetchError(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error || '')
  const message = raw.replace(/\s+/g, ' ').trim()
  if (!message) return 'upstream_fetch_failed'
  return message.slice(0, 200)
}

export async function listMountedObjects(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const configId = String(url.searchParams.get('config_id') || '').trim()
  if (!configId) {
    return jsonResponse({ error: '缺少 config_id' }, 400)
  }

  const prefix = normalizePrefix(url.searchParams.get('prefix'))
  const continuationToken = normalizeToken(url.searchParams.get('continuation_token'))
  const limit = clampNumber(url.searchParams.get('limit'), 1, 500, 100)

  const loaded = await loadR2ConfigById(env, configId)
  if (!loaded) {
    return jsonResponse({ error: '配置不存在或不可用' }, 404)
  }

  try {
    const result = await listObjectsV2(loaded.config, {
      prefix,
      delimiter: '/',
      maxKeys: limit,
      continuationToken: continuationToken || undefined,
    })

    return jsonResponse({
      config_id: configId,
      prefix,
      delimiter: '/',
      limit,
      continuation_token: continuationToken,
      next_continuation_token: result.next_continuation_token || null,
      is_truncated: result.is_truncated,
      key_count: result.key_count,
      folders: result.common_prefixes,
      objects: result.contents,
    })
  } catch (error) {
    const formatted = formatListError(error)
    return jsonResponse({ error: formatted.message }, formatted.status)
  }
}

export async function downloadMountedObject(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const configId = String(url.searchParams.get('config_id') || '').trim()
  const key = String(url.searchParams.get('key') || '')

  if (!configId) {
    return jsonResponse({ error: '缺少 config_id' }, 400)
  }

  if (!key) {
    return jsonResponse({ error: '缺少 key' }, 400)
  }

  const loaded = await loadR2ConfigById(env, configId)
  if (!loaded) {
    return jsonResponse({ error: '配置不存在或不可用' }, 404)
  }

  const filename = getBasename(key) || 'file'

  try {
    const downloadUrl = await generateDownloadUrl(loaded.config, key, filename, 3600)
    return redirect(downloadUrl, 302)
  } catch (error) {
    const message = formatUpstreamFetchError(error)
    return jsonResponse({ error: `生成下载链接失败：${message}` }, 502)
  }
}

export async function previewMountedObject(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url)
  const configId = String(url.searchParams.get('config_id') || '').trim()
  const key = String(url.searchParams.get('key') || '')

  if (!configId) {
    return jsonResponse({ error: '缺少 config_id' }, 400)
  }

  if (!key) {
    return jsonResponse({ error: '缺少 key' }, 400)
  }

  const loaded = await loadR2ConfigById(env, configId)
  if (!loaded) {
    return jsonResponse({ error: '配置不存在或不可用' }, 404)
  }

  const filename = getBasename(key) || 'file'
  const extension = getFilenameExtension(filename)
  const mode = resolvePreviewModeByExtension(extension)
  if (!mode) {
    return jsonResponse({ error: '不支持预览该文件类型' }, 415)
  }

  let previewUrl = ''
  try {
    previewUrl = await generatePreviewUrl(
      loaded.config,
      key,
      filename,
      600,
      mode.kind === 'redirect' ? mode.responseContentType : undefined
    )
  } catch (error) {
    return jsonResponse({ error: `生成预览链接失败：${formatUpstreamFetchError(error)}` }, 502)
  }

  if (mode.kind === 'redirect') {
    return redirect(previewUrl, 302)
  }

  const MAX_PREVIEW_BYTES = 200 * 1024
  let response: Response
  try {
    response = await fetch(previewUrl, {
      headers: {
        Range: `bytes=0-${MAX_PREVIEW_BYTES - 1}`,
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
    const text = await response.text().catch(() => '')
    return jsonResponse({ error: text || '预览内容获取失败' }, response.status || 502)
  }

  const headers = new Headers()
  headers.set('Content-Type', mode.responseContentType)
  headers.set('Cache-Control', 'no-store')
  headers.set('X-Content-Type-Options', 'nosniff')

  return new Response(response.body, {
    status: response.status,
    headers,
  })
}
