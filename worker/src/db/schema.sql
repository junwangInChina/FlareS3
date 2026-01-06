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
