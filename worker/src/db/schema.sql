-- users
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('admin','user')),
  status TEXT NOT NULL CHECK(status IN ('active','disabled','deleted')),
  quota_bytes INTEGER NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  last_login_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- sessions
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  ip TEXT,
  user_agent TEXT,
  created_at DATETIME NOT NULL,
  revoked_at DATETIME
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- files
CREATE TABLE IF NOT EXISTS files (
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
);

CREATE INDEX IF NOT EXISTS idx_files_owner_id ON files(owner_id);
CREATE INDEX IF NOT EXISTS idx_files_expires_at ON files(expires_at);
CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at);
CREATE UNIQUE INDEX IF NOT EXISTS idx_files_short_code ON files(short_code);

-- audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY,
  actor_user_id TEXT,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  ip TEXT,
  user_agent TEXT,
  metadata TEXT,
  created_at DATETIME NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_logs(created_at);

-- system_config
CREATE TABLE IF NOT EXISTS system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at DATETIME NOT NULL
);

-- delete_queue
CREATE TABLE IF NOT EXISTS delete_queue (
  id TEXT PRIMARY KEY,
  file_id TEXT NOT NULL,
  r2_key TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  processed_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_delete_queue_processed ON delete_queue(processed_at);

-- rate_limits
CREATE TABLE IF NOT EXISTS rate_limits (
  ip TEXT PRIMARY KEY,
  request_count INTEGER DEFAULT 0,
  window_start DATETIME DEFAULT CURRENT_TIMESTAMP,
  blocked_until DATETIME,
  failed_attempts INTEGER DEFAULT 0
);

-- texts
CREATE TABLE IF NOT EXISTS texts (
  id TEXT PRIMARY KEY,
  owner_id TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  content TEXT NOT NULL,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL,
  deleted_at DATETIME
);

CREATE INDEX IF NOT EXISTS idx_texts_owner_id ON texts(owner_id);
CREATE INDEX IF NOT EXISTS idx_texts_updated_at ON texts(updated_at);
CREATE INDEX IF NOT EXISTS idx_texts_deleted_at ON texts(deleted_at);

-- text_shares
CREATE TABLE IF NOT EXISTS text_shares (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_text_shares_text_id ON text_shares(text_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_text_shares_share_code ON text_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_text_shares_owner_id ON text_shares(owner_id);

-- text_one_time_shares
CREATE TABLE IF NOT EXISTS text_one_time_shares (
  id TEXT PRIMARY KEY,
  text_id TEXT NOT NULL UNIQUE,
  owner_id TEXT NOT NULL,
  share_code TEXT NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  consumed_at DATETIME,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_text_one_time_shares_text_id ON text_one_time_shares(text_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_text_one_time_shares_share_code ON text_one_time_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_text_one_time_shares_expires_at ON text_one_time_shares(expires_at);

-- file_shares
CREATE TABLE IF NOT EXISTS file_shares (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_file_shares_file_id ON file_shares(file_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_file_shares_share_code ON file_shares(share_code);
CREATE INDEX IF NOT EXISTS idx_file_shares_owner_id ON file_shares(owner_id);

-- r2_configs
CREATE TABLE IF NOT EXISTS r2_configs (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  bucket_name TEXT NOT NULL,
  access_key_id_enc TEXT NOT NULL,
  secret_access_key_enc TEXT NOT NULL,
  quota_bytes INTEGER NOT NULL DEFAULT 10737418240,
  created_at DATETIME NOT NULL,
  updated_at DATETIME NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_r2_configs_name ON r2_configs(name);
