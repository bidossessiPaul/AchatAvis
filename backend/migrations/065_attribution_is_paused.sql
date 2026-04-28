-- 065_attribution_is_paused.sql
-- Ajoute is_paused sur signalement_attributions pour permettre à l'admin
-- de suspendre temporairement une attribution sans la supprimer.
-- Idempotente via INFORMATION_SCHEMA check.

SET @col_exists = (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME   = 'signalement_attributions'
      AND COLUMN_NAME  = 'is_paused'
);

SET @sql = IF(@col_exists = 0,
    'ALTER TABLE signalement_attributions ADD COLUMN is_paused TINYINT(1) NOT NULL DEFAULT 0 AFTER nb_avis_consumed',
    'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
