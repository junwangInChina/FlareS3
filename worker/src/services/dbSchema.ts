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

export async function ensureTextSharesTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS text_shares (
        id TEXT PRIMARY KEY,
        text_id TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL,
        share_code TEXT NOT NULL UNIQUE,
        password_hash TEXT,
        expires_in INTEGER NOT NULL DEFAULT 0,
        expires_at DATETIME,
        max_views INTEGER NOT NULL DEFAULT 0,
        views INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )`
    )
    .run()

  await db
    .prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_text_shares_text_id ON text_shares(text_id)')
    .run()
  await db
    .prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_text_shares_share_code ON text_shares(share_code)'
    )
    .run()
  await db
    .prepare('CREATE INDEX IF NOT EXISTS idx_text_shares_owner_id ON text_shares(owner_id)')
    .run()
}

export async function ensureTextOneTimeSharesTable(db: D1Database): Promise<void> {
  await db
    .prepare(
      `CREATE TABLE IF NOT EXISTS text_one_time_shares (
        id TEXT PRIMARY KEY,
        text_id TEXT NOT NULL UNIQUE,
        owner_id TEXT NOT NULL,
        share_code TEXT NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        consumed_at DATETIME,
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )`
    )
    .run()

  await db
    .prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_text_one_time_shares_text_id ON text_one_time_shares(text_id)'
    )
    .run()
  await db
    .prepare(
      'CREATE UNIQUE INDEX IF NOT EXISTS idx_text_one_time_shares_share_code ON text_one_time_shares(share_code)'
    )
    .run()
  await db
    .prepare(
      'CREATE INDEX IF NOT EXISTS idx_text_one_time_shares_expires_at ON text_one_time_shares(expires_at)'
    )
    .run()
}
