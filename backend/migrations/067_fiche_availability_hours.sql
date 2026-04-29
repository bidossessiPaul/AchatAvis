-- Migration 067 : Plage horaire de disponibilité des fiches
-- Par défaut, chaque fiche est disponible 7h-23h (Europe/Paris).
-- En dehors de cette plage, un guide ne peut plus verrouiller la fiche.
-- L'artisan et l'admin peuvent modifier ces horaires par fiche.

-- Ajout de available_from si elle n'existe pas
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'reviews_orders'
                     AND COLUMN_NAME = 'available_from');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE reviews_orders ADD COLUMN available_from TIME NOT NULL DEFAULT ''07:00:00''',
    'SELECT ''available_from already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Ajout de available_to si elle n'existe pas
SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'reviews_orders'
                     AND COLUMN_NAME = 'available_to');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE reviews_orders ADD COLUMN available_to TIME NOT NULL DEFAULT ''23:00:00''',
    'SELECT ''available_to already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Backfill : forcer 07h-23h sur toutes les fiches existantes (au cas où des valeurs auraient été insérées différemment)
UPDATE reviews_orders SET available_from = '07:00:00' WHERE available_from IS NULL;
UPDATE reviews_orders SET available_to = '23:00:00' WHERE available_to IS NULL;
