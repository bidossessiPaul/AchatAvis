-- Fix for failed migration 025
-- Adapting to use 'trust_level' instead of 'account_level' as reference

-- Add maps_profile_url if not exists (using safe approach)
SELECT count(*) INTO @exist FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'guide_gmail_accounts' AND column_name = 'maps_profile_url';

SET @query = IF(@exist = 0, 
    'ALTER TABLE guide_gmail_accounts ADD COLUMN maps_profile_url VARCHAR(255) NULL AFTER email', 
    'SELECT "Column maps_profile_url already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add local_guide_level
SELECT count(*) INTO @exist FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'guide_gmail_accounts' AND column_name = 'local_guide_level';

SET @query = IF(@exist = 0, 
    'ALTER TABLE guide_gmail_accounts ADD COLUMN local_guide_level INT DEFAULT 1 AFTER trust_level', 
    'SELECT "Column local_guide_level already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add total_reviews_google
SELECT count(*) INTO @exist FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'guide_gmail_accounts' AND column_name = 'total_reviews_google';

SET @query = IF(@exist = 0, 
    'ALTER TABLE guide_gmail_accounts ADD COLUMN total_reviews_google INT DEFAULT 0 AFTER total_reviews_posted', 
    'SELECT "Column total_reviews_google already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add avatar_url
SELECT count(*) INTO @exist FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'guide_gmail_accounts' AND column_name = 'avatar_url';

SET @query = IF(@exist = 0, 
    'ALTER TABLE guide_gmail_accounts ADD COLUMN avatar_url TEXT NULL AFTER has_profile_picture', 
    'SELECT "Column avatar_url already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add is_verified
SELECT count(*) INTO @exist FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'guide_gmail_accounts' AND column_name = 'is_verified';

SET @query = IF(@exist = 0, 
    'ALTER TABLE guide_gmail_accounts ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER is_active', 
    'SELECT "Column is_verified already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Add verification_date
SELECT count(*) INTO @exist FROM information_schema.columns 
WHERE table_schema = DATABASE() AND table_name = 'guide_gmail_accounts' AND column_name = 'verification_date';

SET @query = IF(@exist = 0, 
    'ALTER TABLE guide_gmail_accounts ADD COLUMN verification_date DATETIME NULL AFTER is_verified', 
    'SELECT "Column verification_date already exists"');

PREPARE stmt FROM @query;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
