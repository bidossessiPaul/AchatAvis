-- Migration 052: Add soft delete for Gmail accounts blacklisting
-- When a guide deletes a Gmail, it's kept in memory so no one can re-use it for rewards

ALTER TABLE guide_gmail_accounts
ADD COLUMN IF NOT EXISTS deleted_at DATETIME NULL DEFAULT NULL,
ADD COLUMN IF NOT EXISTS deleted_by_user_id VARCHAR(36) NULL DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_gmail_deleted ON guide_gmail_accounts(deleted_at);
