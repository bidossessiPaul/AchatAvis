-- Migration: Add Gmail Verification Fields
-- Description: Adds fields to track Google Maps profile data and verification status for guide Gmail accounts.

ALTER TABLE guide_gmail_accounts
ADD COLUMN maps_profile_url VARCHAR(255) NULL AFTER email,
ADD COLUMN local_guide_level INT DEFAULT 1 AFTER account_level,
ADD COLUMN total_reviews_google INT DEFAULT 0 AFTER total_reviews_posted,
ADD COLUMN avatar_url TEXT NULL AFTER has_profile_picture,
ADD COLUMN is_verified BOOLEAN DEFAULT FALSE AFTER is_active,
ADD COLUMN verification_date DATETIME NULL AFTER is_verified;
