-- Migration 081 : Pause automatique de la fiche après chaque avis soumis
-- Problème client : les guides postent tous les avis du jour en quelques minutes,
-- puis plus rien. On veut ÉTALER les avis dans la journée.
-- Solution : après chaque soumission, la fiche se met en pause (paused_until) pour
-- une durée aléatoire (1 à 4h, calculée côté backend). Pendant la pause, la fiche
-- disparaît pour TOUS les guides — exactement comme si le quota du jour était pris —
-- puis réapparaît, jusqu'à ce que reviews_per_day soit atteint pour la journée.

SET @col_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'reviews_orders'
                     AND COLUMN_NAME = 'paused_until');

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE reviews_orders ADD COLUMN paused_until DATETIME DEFAULT NULL',
    'SELECT ''paused_until already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- Index pour filtrer rapidement les fiches en pause au moment de lister les disponibles
SET @idx_exists = (SELECT COUNT(*) FROM INFORMATION_SCHEMA.STATISTICS
                   WHERE TABLE_SCHEMA = DATABASE()
                     AND TABLE_NAME = 'reviews_orders'
                     AND INDEX_NAME = 'idx_reviews_orders_paused_until');

SET @sql = IF(@idx_exists = 0,
    'CREATE INDEX idx_reviews_orders_paused_until ON reviews_orders (paused_until)',
    'SELECT ''idx_reviews_orders_paused_until already exists'' AS message');
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
