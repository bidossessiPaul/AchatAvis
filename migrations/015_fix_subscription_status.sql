-- Fix: Ensure subscription_status exists in artisans_profiles
-- This migration handles the case where IF NOT EXISTS syntax failed in older MySQL

-- Check if the column exists, if not add it
SET @dbname = DATABASE();
SET @tablename = 'artisans_profiles';
SET @columnname = 'subscription_status';
SET @preparedStatement = (SELECT IF(
  (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE 
      (TABLE_SCHEMA = @dbname)
      AND (TABLE_NAME = @tablename)
      AND (COLUMN_NAME = @columnname)
  ) > 0,
  'SELECT 1',
  CONCAT('ALTER TABLE ', @tablename, ' ADD COLUMN ', @columnname, ' VARCHAR(20) DEFAULT "inactive"')
));

PREPARE alterIfNotExists FROM @preparedStatement;
EXECUTE alterIfNotExists;
DEALLOCATE PREPARE alterIfNotExists;
