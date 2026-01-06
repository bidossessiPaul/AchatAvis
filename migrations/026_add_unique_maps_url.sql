-- Migration: Add Unique Constraint to Google Maps URL
-- Description: Ensures that each Google Maps profile can only be linked to one account to prevent fraud.

ALTER TABLE guide_gmail_accounts
ADD UNIQUE INDEX unique_maps_profile_url (maps_profile_url);
