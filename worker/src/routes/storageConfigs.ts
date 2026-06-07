import type { Env } from '../config/env'
import { getTotalStorage } from '../config/env'
import { jsonResponse } from './utils'
import { formatBytes } from '../utils/format'
import { listR2ConfigSummaries, loadR2ConfigById } from '../services/r2'
import { listWebDAVConfigs, loadWebDAVConfigById } from '../services/storage/webdav-config'
import {
  measureRouteStep,
  withRouteTimingHeaders,
  type RouteTimingEntry,
} from '../utils/routeTiming'

const ACTIVE_COMPLETED_STORAGE_USAGE_WHERE = "upload_status = 'completed' AND deleted_at IS NULL"

function toUsageMap(
  rows: Array<{ config_id?: unknown; used_space?: unknown }>
): Map<string, number> {
  const usage = new Map<string, number>()
  for (const row of rows) {
    const configId = String(row.config_id || '').trim()
    if (!configId) continue
    const usedSpace = Number(row.used_space || 0)
    const normalizedUsedSpace = Number.isFinite(usedSpace) && usedSpace > 0 ? usedSpace : 0
    usage.set(configId, (usage.get(configId) || 0) + normalizedUsedSpace)
  }
  return usage
}

async function listCompletedConfigUsage(db: D1Database): Promise<Map<string, number>> {
  const rows = await db
    .prepare(
      `SELECT config_id, COALESCE(SUM(size), 0) AS used_space
         FROM files
        WHERE ${ACTIVE_COMPLETED_STORAGE_USAGE_WHERE}
          AND config_id IS NOT NULL
          AND TRIM(config_id) <> ''
        GROUP BY config_id
       UNION ALL
       SELECT SUBSTR(rest, 1, INSTR(rest, '/') - 1) AS config_id,
              COALESCE(SUM(size), 0) AS used_space
         FROM (
                SELECT SUBSTR(r2_key, 9) AS rest, size
                  FROM files
                 WHERE ${ACTIVE_COMPLETED_STORAGE_USAGE_WHERE}
                   AND (config_id IS NULL OR TRIM(config_id) = '')
                   AND r2_key LIKE 'flares3/%/%'
              )
        WHERE INSTR(rest, '/') > 0
        GROUP BY SUBSTR(rest, 1, INSTR(rest, '/') - 1)`
    )
    .all<{ config_id: string; used_space: number }>()

  return toUsageMap(rows.results || [])
}

async function listReservedConfigUsage(db: D1Database): Promise<Map<string, number>> {
  const rows = await db
    .prepare(
      `SELECT r2_config_id AS config_id,
              COALESCE(SUM(reserved_bytes), 0) AS used_space
         FROM upload_reservations
        WHERE status = 'active'
        GROUP BY r2_config_id`
    )
    .all<{ config_id: string; used_space: number }>()

  return toUsageMap(rows.results || [])
}

async function getLegacyUsedSpace(db: D1Database): Promise<number> {
  const legacyUsedSpaceRow = await db
    .prepare(
      `SELECT COALESCE(SUM(size), 0) AS usedSpace
         FROM files
        WHERE ${ACTIVE_COMPLETED_STORAGE_USAGE_WHERE}
          AND (config_id IS NULL OR TRIM(config_id) = '')
          AND r2_key NOT LIKE 'flares3/%/%'`
    )
    .first('usedSpace')
  const legacyUsedSpace = Number(legacyUsedSpaceRow || 0)
  return Number.isFinite(legacyUsedSpace) && legacyUsedSpace > 0 ? legacyUsedSpace : 0
}

function getMappedUsage(usage: Map<string, number>, configId: string): number {
  return Number(usage.get(configId) || 0)
}

function secretJsonResponse(data: unknown, status = 200): Response {
  return jsonResponse(data, status, { 'Cache-Control': 'no-store' })
}

export async function listAllConfigs(_request: Request, env: Env): Promise<Response> {
  const timings: RouteTimingEntry[] = []
  const [r2Result, webdavConfigs, completedUsage, reservedUsage, legacyUsedSpace] =
    await Promise.all([
      measureRouteStep(timings, 'r2ConfigRows', () => listR2ConfigSummaries(env)),
      measureRouteStep(timings, 'webdavConfigRows', () => listWebDAVConfigs(env.DB)),
      measureRouteStep(timings, 'completedUsageRows', () => listCompletedConfigUsage(env.DB)),
      measureRouteStep(timings, 'reservedUsageRows', () => listReservedConfigUsage(env.DB)),
      measureRouteStep(timings, 'legacyUsageRow', () => getLegacyUsedSpace(env.DB)),
    ])

  const { default_config_id, legacy_files_config_id, configs: r2Configs } = r2Result
  const legacyAssignedId = legacy_files_config_id || default_config_id

  type UnifiedConfig = {
    id: string
    name: string
    type: 'r2' | 'webdav' | 'koofr'
    source?: string
    endpoint: string
    bucket_name?: string
    remote_path?: string
    mount_id?: string | null
    usedSpace: number
    totalSpace: number
    usedSpaceFormatted: string
    totalSpaceFormatted: string
    usagePercent: number
  }

  const configs: UnifiedConfig[] = []

  // R2 配置
  for (const config of r2Configs) {
    const totalSpace = config.source === 'legacy' ? getTotalStorage(env) : config.quotaBytes
    let usedSpace =
      getMappedUsage(completedUsage, config.id) + getMappedUsage(reservedUsage, config.id)
    if (legacyAssignedId && legacyUsedSpace > 0 && config.id === legacyAssignedId) {
      usedSpace += legacyUsedSpace
    }

    const usagePercent = totalSpace ? (usedSpace / totalSpace) * 100 : 0
    configs.push({
      id: config.id,
      name: config.name,
      type: 'r2',
      source: config.source,
      endpoint: config.endpoint,
      bucket_name: config.bucketName,
      usedSpace,
      totalSpace,
      usedSpaceFormatted: formatBytes(usedSpace),
      totalSpaceFormatted: formatBytes(totalSpace),
      usagePercent,
    })
  }

  for (const cfg of webdavConfigs) {
    const usedSpace = getMappedUsage(completedUsage, cfg.id) + getMappedUsage(reservedUsage, cfg.id)
    const usagePercent = cfg.quotaBytes ? (usedSpace / cfg.quotaBytes) * 100 : 0
    configs.push({
      id: cfg.id,
      name: cfg.name,
      type: cfg.type,
      endpoint: cfg.endpoint,
      remote_path: cfg.remote_path,
      usedSpace,
      totalSpace: cfg.quotaBytes,
      usedSpaceFormatted: formatBytes(usedSpace),
      totalSpaceFormatted: formatBytes(cfg.quotaBytes),
      usagePercent,
    })
  }

  return withRouteTimingHeaders(
    jsonResponse({
      default_config_id,
      legacy_files_config_id,
      configs,
    }),
    timings
  )
}

export async function getConfigSecrets(request: Request, env: Env, id: string): Promise<Response> {
  if (!id) return secretJsonResponse({ error: '配置 ID 不能为空' }, 400)

  const type = new URL(request.url).searchParams.get('type')
  if (type === 'r2') {
    try {
      const loaded = await loadR2ConfigById(env, id)
      if (!loaded) return secretJsonResponse({ error: '配置不存在或密钥不可用' }, 404)

      return secretJsonResponse({
        type: 'r2',
        endpoint: loaded.config.endpoint,
        bucket_name: loaded.config.bucketName,
        access_key_id: loaded.config.accessKeyId,
        secret_access_key: loaded.config.secretAccessKey,
      })
    } catch {
      return secretJsonResponse({ error: '读取配置密钥失败' }, 500)
    }
  }

  if (type === 'webdav' || type === 'koofr') {
    const loaded = await loadWebDAVConfigById(env, id)
    if (!loaded || loaded.type !== type) {
      return secretJsonResponse({ error: '配置不存在或密钥不可用' }, 404)
    }

    return secretJsonResponse({
      type: loaded.type,
      endpoint: loaded.config.endpoint,
      remote_path: loaded.config.remotePath,
      username: loaded.config.username,
      password: loaded.config.password,
    })
  }

  return secretJsonResponse({ error: 'type 必须为 r2、webdav 或 koofr' }, 400)
}
