-- Migration: Add Anti-Detection Fields to Campaigns (Reviews Orders)
-- Description: Adds columns for sector configuration, review rhythm, and client localization.

-- Add sector_slug to allow improved difficulty logic
-- Pas de AFTER : la colonne sector_id n'a jamais existé sur reviews_orders,
-- et la position d'une colonne n'a aucun impact fonctionnel.
ALTER TABLE reviews_orders ADD COLUMN sector_slug VARCHAR(100) NULL;

-- Add rhythm control fields
ALTER TABLE reviews_orders ADD COLUMN reviews_per_day INT DEFAULT 3;
ALTER TABLE reviews_orders ADD COLUMN rhythme_mode ENUM('discret', 'modere', 'rapide') DEFAULT 'modere';
ALTER TABLE reviews_orders ADD COLUMN estimated_duration_days INT;

-- Add client localization (list of generated cities)
ALTER TABLE reviews_orders ADD COLUMN client_cities JSON;
