import type { Env } from '../config/env'
import {
  resolveR2ConfigForKey,
  deleteObject,
  abortMultipartUpload,
  summarizeS3Error,
} from '../services/r2'
import { ensureFilesMultipartUploadIdColumn } from '../services/dbSchema'

const BATCH_SIZE = 100

export async function cleanupDeleteQueue(env: Env): Promise<void> {
  await ensureFilesMultipartUploadIdColumn(env.DB)
  const { results } = await env.DB.prepare(
    `SELECT id, file_id, r2_key FROM delete_queue WHERE processed_at IS NULL ORDER BY created_at ASC LIMIT ?`
  )
    .bind(BATCH_SIZE)
    .all()
  if (!results.length) return

  const now = new Date().toISOString()
  for (const row of results) {
    const queueId = String(row.id)
    const fileId = String(row.file_id)
    const r2Key = String(row.r2_key)

    try {
      const loaded = await resolveR2ConfigForKey(env, r2Key)
      if (!loaded) {
        throw new Error('r2_config_unavailable')
      }
      const multipartUploadIdRow = await env.DB.prepare(
        'SELECT multipart_upload_id FROM files WHERE id = ? LIMIT 1'
      )
        .bind(fileId)
        .first('multipart_upload_id')
      const multipartUploadId = String(multipartUploadIdRow || '').trim()
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
    } catch (error) {
      console.error('cleanupDeleteQueue delete failed', error)
      continue
    }

    await env.DB.prepare('DELETE FROM files WHERE id = ?').bind(fileId).run()
    await env.DB.prepare('UPDATE delete_queue SET processed_at = ? WHERE id = ?')
      .bind(now, queueId)
      .run()
  }
}
