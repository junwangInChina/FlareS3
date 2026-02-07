import { DEFAULT_TOTAL_STORAGE } from '../config/env'

const ensurePromises = new Map<string, Promise<void>>()

function ensureOnce(key: string, task: () => Promise<void>): Promise<void> {
  const existing = ensurePromises.get(key)
  if (existing) return existing
  const promise = task().catch((error) => {
    ensurePromises.delete(key)
    throw error
  })
  ensurePromises.set(key, promise)
  return promise
}

export function ensureFilesMultipartUploadIdColumn(db: D1Database): Promise<void> {
  return ensureOnce('files.multipart_upload_id', async () => {
    const tableInfo = await db.prepare('PRAGMA table_info(files)').all<{
      name: string
    }>()
    const hasColumn = (tableInfo.results || []).some(
      (col) => String(col.name) === 'multipart_upload_id'
    )
    if (hasColumn) return

    await db.prepare('ALTER TABLE files ADD COLUMN multipart_upload_id TEXT').run()
  })
}

export function ensureTextsTable(db: D1Database): Promise<void> {
  return ensureOnce('texts', async () => {
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
  })
}

export function ensureTextSharesTable(db: D1Database): Promise<void> {
  return ensureOnce('text_shares', async () => {
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
  })
}

export function ensureTextOneTimeSharesTable(db: D1Database): Promise<void> {
  return ensureOnce('text_one_time_shares', async () => {
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
  })
}

export function ensureFilesTable(db: D1Database): Promise<void> {
  return ensureOnce('files', async () => {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS files (
          id TEXT PRIMARY KEY,
          owner_id TEXT NOT NULL,
          filename TEXT NOT NULL,
          r2_key TEXT NOT NULL UNIQUE,
          size INTEGER NOT NULL,
          content_type TEXT NOT NULL,
          expires_in INTEGER NOT NULL,
          created_at DATETIME NOT NULL,
          expires_at DATETIME NOT NULL,
          upload_status TEXT NOT NULL CHECK(upload_status IN ('pending','uploading','completed','deleted')),
          short_code TEXT UNIQUE,
          require_login INTEGER NOT NULL DEFAULT 1,
          multipart_upload_id TEXT,
          deleted_at DATETIME
        )`
      )
      .run()

    await db.prepare('CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at)').run()
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at)').run()
    await db
      .prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_files_short_code ON files(short_code)')
      .run()
  })
}

export function ensureFileSharesTable(db: D1Database): Promise<void> {
  return ensureOnce('file_shares', async () => {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS file_shares (
          id TEXT PRIMARY KEY,
          file_id TEXT NOT NULL UNIQUE,
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
      .prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id)')
      .run()
    await db
      .prepare(
        'CREATE UNIQUE INDEX IF NOT EXISTS idx_file_shares_share_code ON file_shares(share_code)'
      )
      .run()
    await db
      .prepare('CREATE INDEX IF NOT EXISTS idx_file_shares_owner_id ON file_shares(owner_id)')
      .run()
  })
}

export function ensureR2ConfigsTable(db: D1Database): Promise<void> {
  return ensureOnce('r2_configs', async () => {
    await db
      .prepare(
        `CREATE TABLE IF NOT EXISTS r2_configs (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        endpoint TEXT NOT NULL,
        bucket_name TEXT NOT NULL,
        access_key_id_enc TEXT NOT NULL,
        secret_access_key_enc TEXT NOT NULL,
        quota_bytes INTEGER NOT NULL DEFAULT ${DEFAULT_TOTAL_STORAGE},
        created_at DATETIME NOT NULL,
        updated_at DATETIME NOT NULL
      )`
      )
      .run()

    await db
      .prepare('CREATE UNIQUE INDEX IF NOT EXISTS idx_r2_configs_name ON r2_configs(name)')
      .run()

    const tableInfo = await db.prepare('PRAGMA table_info(r2_configs)').all<{
      name: string
    }>()
    const hasQuotaBytes = (tableInfo.results || []).some(
      (col) => String(col.name) === 'quota_bytes'
    )
    if (!hasQuotaBytes) {
      await db
        .prepare(
          `ALTER TABLE r2_configs ADD COLUMN quota_bytes INTEGER NOT NULL DEFAULT ${DEFAULT_TOTAL_STORAGE}`
        )
        .run()
    }
  })
}
