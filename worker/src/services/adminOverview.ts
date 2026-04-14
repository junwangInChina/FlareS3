import type { Env } from '../config/env'
import { SYSTEM_DEFAULT_R2_CONFIG_ID_KEY } from './r2'
import { ensureJobRunsTable } from './dbSchema'
import { formatBytes } from '../utils/format'

export type AdminOverviewRisk = {
  code: string
  severity: 'warning' | 'error'
  message: string
  jobName?: string
}

export async function getAdminOverviewData(env: Env): Promise<{
  metrics: {
    totalUsers: number
    activeUsers: number
    disabledUsers: number
    totalFiles: number
    usedSpace: number
    usedSpaceFormatted: string
    expiringThisWeek: number
    pendingDeleteQueue: number
  }
  setup: {
    configCount: number
    defaultConfigId: string | null
    hasUploadConfig: boolean
  }
  risks: AdminOverviewRisk[]
}> {
  const totalUsers = Number(
    (await env.DB.prepare('SELECT COUNT(*) AS total FROM users').first<{ total: number }>())?.total || 0
  )
  const activeUsers = Number(
    (
      await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE status = 'active'").first<{
        total: number
      }>()
    )?.total || 0
  )
  const disabledUsers = Number(
    (
      await env.DB.prepare("SELECT COUNT(*) AS total FROM users WHERE status = 'disabled'").first<{
        total: number
      }>()
    )?.total || 0
  )

  const filesRow = await env.DB.prepare(
    `SELECT COUNT(*) AS totalFiles, COALESCE(SUM(size), 0) AS usedSpace FROM files WHERE upload_status = 'completed' AND deleted_at IS NULL`
  ).first<{ totalFiles: number; usedSpace: number }>()
  const totalFiles = Number(filesRow?.totalFiles || 0)
  const usedSpace = Number(filesRow?.usedSpace || 0)

  const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const expiringThisWeek = Number(
    (
      await env.DB.prepare(
        `SELECT COUNT(*) AS count FROM files WHERE upload_status IN ('pending','uploading','completed') AND deleted_at IS NULL AND expires_at < ?`
      )
        .bind(nextWeek)
        .first<{ count: number }>()
    )?.count || 0
  )

  const pendingDeleteQueue = Number(
    (
      await env.DB.prepare(
        'SELECT COUNT(*) AS count FROM delete_queue WHERE processed_at IS NULL'
      ).first<{ count: number }>()
    )?.count || 0
  )

  const configCount = Number(
    (await env.DB.prepare('SELECT COUNT(*) AS count FROM r2_configs').first<{ count: number }>())?.count || 0
  )
  const defaultConfigIdValue = await env.DB.prepare('SELECT value FROM system_config WHERE key = ?')
    .bind(SYSTEM_DEFAULT_R2_CONFIG_ID_KEY)
    .first('value')
  const defaultConfigId = defaultConfigIdValue ? String(defaultConfigIdValue) : null
  const hasUploadConfig = configCount > 0

  await ensureJobRunsTable(env.DB)
  const latestFailedJob = await env.DB.prepare(
    `SELECT job_name, status, finished_at, error_message FROM job_runs WHERE status IN ('failed','partial') ORDER BY created_at DESC LIMIT 1`
  ).first<{
    job_name: string
    status: 'failed' | 'partial'
    finished_at: string | null
    error_message: string | null
  }>()

  const risks: AdminOverviewRisk[] = []

  if (!defaultConfigId && hasUploadConfig) {
    risks.push({
      code: 'missing_default_upload_config',
      severity: 'warning',
      message: '当前存在上传配置，但未设置默认上传配置',
    })
  }

  if (latestFailedJob) {
    risks.push({
      code: 'scheduled_job_failed',
      severity: 'error',
      message: `最近任务失败：${String(latestFailedJob.job_name)}`,
      jobName: String(latestFailedJob.job_name),
    })
  }

  return {
    metrics: {
      totalUsers,
      activeUsers,
      disabledUsers,
      totalFiles,
      usedSpace,
      usedSpaceFormatted: formatBytes(usedSpace),
      expiringThisWeek,
      pendingDeleteQueue,
    },
    setup: {
      configCount,
      defaultConfigId,
      hasUploadConfig,
    },
    risks,
  }
}
