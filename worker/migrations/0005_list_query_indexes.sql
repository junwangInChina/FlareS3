-- Composite indexes for authenticated list APIs.
-- These match the common WHERE + ORDER BY patterns in files/texts/users/audit routes.

CREATE INDEX IF NOT EXISTS idx_files_deleted_created ON files(deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_owner_deleted_created ON files(owner_id, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_status_deleted_created ON files(upload_status, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_owner_status_deleted_created ON files(owner_id, upload_status, deleted_at, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_status_deleted_at ON files(upload_status, deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_files_owner_status_deleted_at ON files(owner_id, upload_status, deleted_at DESC);

CREATE INDEX IF NOT EXISTS idx_texts_deleted_updated ON texts(deleted_at, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_texts_owner_deleted_updated ON texts(owner_id, deleted_at, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_status_created ON users(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_users_role_created ON users(role, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_actor_created ON audit_logs(actor_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_action_created ON audit_logs(action, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_actor_action_created ON audit_logs(actor_user_id, action, created_at DESC);
