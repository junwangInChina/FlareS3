import type { Env } from '../config/env'
import {
  resolveR2ConfigForKey,
  deleteObject,
  abortMultipartUpload,
  summarizeS3Error,
} from '../services/r2'
import { ensureFilesMultipartUploadIdColumn } from '../services/dbSchema'
import { buildJobResult, type JobExecutionResult } from '../services/jobRuns'

const BATCH_SIZE = 100

export async function cleanupExpired(env: Env): Promise<JobExecutionResult> {
  const startedAtMs = Date.now()
  const now = new Date().toISOString()
  await ensureFilesMultipartUploadIdColumn(env.DB)
  const { results } = await env.DB.prepare(
    `SELECT id, r2_key, upload_status, multipart_upload_id FROM files
     WHERE expires_at < ? AND upload_status IN ('pending','uploading','completed') AND deleted_at IS NULL
     LIMIT ?`
  )
    .bind(now, BATCH_SIZE)
    .all()
  if (!results.length) {
    return buildJobResult('cleanupExpired', startedAtMs, {
      status: 'success',
      processed: 0,
      succeeded: 0,
      failed: 0,
      details: { deletedFiles: 0, missingConfigs: 0 },
    })
  }

  let succeeded = 0
  let failed = 0
  let deletedFiles = 0
  let missingConfigs = 0

  for (const row of results) {
    try {
      const r2Key = String(row.r2_key)
      const loaded = await resolveR2ConfigForKey(env, r2Key)
      if (!loaded) {
        failed += 1
        missingConfigs += 1
        continue
      }
      const multipartUploadId = String((row as any).multipart_upload_id || '').trim()
      if (multipartUploadId) {
        try {
          await abortMultipartUpload(loaded.config, r2Key, multipartUploadId)
        } catch (error) {
          const summary = summarizeS3Error(error)
          if (summary.httpStatusCode !== 404 && summary.code !== 'NoSuchUpload') {
            throw error
          }
          await deleteObject(loaded.config, r2Key)
        }
      } else {
        await deleteObject(loaded.config, r2Key)
      }
      await env.DB.prepare(
        `UPDATE files SET upload_status = 'deleted', deleted_at = ?, multipart_upload_id = NULL WHERE id = ?`
      )
        .bind(now, row.id)
        .run()
      succeeded += 1
      deletedFiles += 1
    } catch (error) {
      failed += 1
      console.error('cleanupExpired failed', error)
    }
  }

  return buildJobResult('cleanupExpired', startedAtMs, {
    status: failed > 0 ? (succeeded > 0 ? 'partial' : 'failed') : 'success',
    processed: results.length,
    succeeded,
    failed,
    details: {
      deletedFiles,
      missingConfigs,
    },
  })
}
