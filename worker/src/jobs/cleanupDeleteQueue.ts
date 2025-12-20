import type { Env } from '../config/env'
import { loadR2Config, deleteObject } from '../services/r2'

const BATCH_SIZE = 100

export async function cleanupDeleteQueue(env: Env): Promise<void> {
  const loaded = await loadR2Config(env)
  if (!loaded) {
    return
  }
  const { results } = await env.DB.prepare(
    `SELECT id, file_id, r2_key FROM delete_queue WHERE processed_at IS NULL LIMIT ?`
  )
    .bind(BATCH_SIZE)
    .all()
  if (!results.length) return
  const now = new Date().toISOString()
  for (const row of results) {
    try {
      await deleteObject(loaded.config, String(row.r2_key))
    } catch (error) {
      console.error('cleanupDeleteQueue delete failed', error)
    }
    await env.DB.prepare('DELETE FROM files WHERE id = ?')
      .bind(row.file_id)
      .run()
    await env.DB.prepare('UPDATE delete_queue SET processed_at = ? WHERE id = ?')
      .bind(now, row.id)
      .run()
  }
}
