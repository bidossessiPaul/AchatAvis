-- 058_perf_indexes_hot_paths.sql
-- Performance indexes for the hot paths that were saturating the MySQL pool
-- and causing /auth/me / refresh-token / login to time out (which in turn
-- triggered random logouts on the frontend).
--
-- These indexes back the correlated COUNT subqueries that getUserById() and
-- the artisan/guide list endpoints run on every navigation:
--   SELECT COUNT(*) FROM reviews_submissions WHERE guide_id = ? AND status = ?
--   SELECT COUNT(*) FROM reviews_orders     WHERE artisan_id = ? AND status != ?
--
-- Idempotent: each statement is wrapped so re-running the migration is safe.

-- 1. Composite index for "validated reviews per guide"
--    Used by: getUserById, getRejectedSubmissions, /admin/guides
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reviews_submissions'
    AND INDEX_NAME = 'idx_submissions_guide_status'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_submissions_guide_status ON reviews_submissions(guide_id, status)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 2. Composite index for "active fiches per artisan"
--    Used by: getUserById (fiches_used count), /artisan/orders, /admin/artisans
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'reviews_orders'
    AND INDEX_NAME = 'idx_orders_artisan_status'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_orders_artisan_status ON reviews_orders(artisan_id, status)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. Index on users.last_seen — written by every authenticated request
--    (throttled to 1/min per user but still useful for /admin "online users")
SET @idx_exists := (
  SELECT COUNT(*) FROM information_schema.STATISTICS
  WHERE TABLE_SCHEMA = DATABASE()
    AND TABLE_NAME = 'users'
    AND INDEX_NAME = 'idx_users_last_seen'
);
SET @sql := IF(@idx_exists = 0,
  'CREATE INDEX idx_users_last_seen ON users(last_seen)',
  'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
