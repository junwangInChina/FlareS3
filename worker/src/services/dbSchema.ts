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

export async function ensureTextsTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS texts (
        id TEXT PRIMARY KEY,
        owner_id TEXT NOT NULL,
        title TEXT NOT NULL DEFAULT '',
        content TEXT NOT NULL,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL,
        deleted_at DATETIME
      )`
    )
    .run()

  await db.prepare('CREATE INDEX IF NOT EXISTS idx_texts_owner_id ON texts(owner_id)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_texts_updated_at ON texts(updated_at)').run()
  await db.prepare('CREATE INDEX IF NOT EXISTS idx_texts_deleted_at ON texts(deleted_at)').run()
}
