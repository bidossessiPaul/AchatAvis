-- Add subscription_start_date to artisans_profiles
ALTER TABLE artisans_profiles ADD COLUMN subscription_start_date DATETIME DEFAULT NULL;
