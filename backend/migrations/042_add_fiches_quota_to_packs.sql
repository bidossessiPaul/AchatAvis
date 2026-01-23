-- Add fiches_quota column to subscription_packs table
-- This column tracks how many fiches an artisan can create with this pack

SET @dbname = DATABASE();
SET @tablename = 'subscription_packs';
SET @columnname = 'fiches_quota';

SET @preparedStatement = (
    SELECT IF(
        (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS 
         WHERE TABLE_SCHEMA = @dbname 
         AND TABLE_NAME = @tablename 
         AND COLUMN_NAME = @columnname) > 0,
        'SELECT 1',
        CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' INT DEFAULT 1 AFTER quantity')
    )
);

PREPARE stmt FROM @preparedStatement;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Update existing packs with default fiches_quota = 1 if NULL
UPDATE subscription_packs SET fiches_quota = 1 WHERE fiches_quota IS NULL OR fiches_quota = 0;
