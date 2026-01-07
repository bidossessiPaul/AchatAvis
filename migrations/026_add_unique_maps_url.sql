-- Migration: Remove Problematic UNIQUE Constraint on Google Maps URL
-- Description: The UNIQUE constraint on maps_profile_url prevents multiple NULL values.
-- Since not all guides will provide a Maps URL, we need to allow multiple NULLs.
-- We'll enforce uniqueness for non-NULL values in the application layer.

ALTER TABLE guide_gmail_accounts
DROP INDEX IF EXISTS unique_maps_profile_url;

-- Add a regular (non-unique) index for performance on lookups
ALTER TABLE guide_gmail_accounts
ADD INDEX idx_maps_profile_url (maps_profile_url);
