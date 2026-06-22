-- Migration 083 : missions GEO sans artisan obligatoire
-- Permet de créer une mission liée à une fiche OU saisie manuellement (client externe)

ALTER TABLE geo_missions
  MODIFY COLUMN artisan_id VARCHAR(36) DEFAULT NULL,
  ADD COLUMN external_name  VARCHAR(200) DEFAULT NULL AFTER artisan_id,
  ADD COLUMN external_email VARCHAR(200) DEFAULT NULL AFTER external_name;
