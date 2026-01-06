export async function ensureFilesMultipartUploadIdColumn(db: D1Database): Promise<void> {
  const tableInfo = await db.prepare('PRAGMA table_info(files)').all<{
    name: string
  }>()
  const hasColumn = (tableInfo.results || []).some(
    (col) => String(col.name) === 'multipart_upload_id'
  )
  if (hasColumn) return

  await db.prepare('ALTER TABLE files ADD COLUMN multipart_upload_id TEXT').run()
}
