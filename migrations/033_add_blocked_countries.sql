-- Migration: Add blocked_countries to suspension_config
-- Description: Adds a column to store the list of countries (ISO codes) where registration is prohibited.

ALTER TABLE suspension_config ADD COLUMN blocked_countries JSON;

-- Add some default blocked countries (example: US, RU if desired, or keep empty)
UPDATE suspension_config SET blocked_countries = '[]' WHERE id = 1;
