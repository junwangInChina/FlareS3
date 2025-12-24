import type { Env } from "../config/env";
import { resolveR2ConfigForKey, deleteObject } from "../services/r2";

const BATCH_SIZE = 100;

export async function cleanupExpired(env: Env): Promise<void> {
  const now = new Date().toISOString();
  const { results } = await env.DB.prepare(
    `SELECT id, r2_key FROM files
     WHERE expires_at < ? AND upload_status = 'completed' AND deleted_at IS NULL
     LIMIT ?`
  )
    .bind(now, BATCH_SIZE)
    .all();
  if (!results.length) return;

  for (const row of results) {
    try {
      const loaded = await resolveR2ConfigForKey(env, String(row.r2_key));
      if (!loaded) continue;
      await deleteObject(loaded.config, String(row.r2_key));
      await env.DB.prepare(
        `UPDATE files SET upload_status = 'deleted', deleted_at = ? WHERE id = ?`
      )
        .bind(now, row.id)
        .run();
    } catch (error) {
      console.error("cleanupExpired failed", error);
    }
  }
}
