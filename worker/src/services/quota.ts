export async function getUserUsedSpace(db: D1Database, userId: string): Promise<number> {
  const now = new Date().toISOString()
  const result = await db
    .prepare(
      "SELECT COALESCE(SUM(size), 0) AS used FROM files WHERE owner_id = ? AND upload_status IN ('pending','uploading','completed') AND deleted_at IS NULL AND expires_at > ?"
    )
    .bind(userId, now)
    .first('used')
  return Number(result || 0)
}
