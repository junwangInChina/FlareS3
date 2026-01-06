import type { Env } from '../config/env'
import {
  resolveR2ConfigForKey,
  deleteObject,
  abortMultipartUpload,
  summarizeS3Error,
} from '../services/r2'
import { ensureFilesMultipartUploadIdColumn } from '../services/dbSchema'

const BATCH_SIZE = 100

export async function cleanupExpired(env: Env): Promise<void> {
  const now = new Date().toISOString()
  await ensureFilesMultipartUploadIdColumn(env.DB)
  const { results } = await env.DB.prepare(
    `SELECT id, r2_key, upload_status, multipart_upload_id FROM files
     WHERE expires_at < ? AND upload_status IN ('pending','uploading','completed') AND deleted_at IS NULL
     LIMIT ?`
  )
    .bind(now, BATCH_SIZE)
    .all()
  if (!results.length) return

  for (const row of results) {
    try {
      const r2Key = String(row.r2_key)
      const loaded = await resolveR2ConfigForKey(env, r2Key)
      if (!loaded) continue
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
    } catch (error) {
      console.error('cleanupExpired failed', error)
    }
  }
}
