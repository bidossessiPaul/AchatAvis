-- Ajout de la colonne `experience_type` sur review_proposals.
-- Indique le type d'expérience du client simulé pour chaque avis généré.
-- 4 valeurs possibles : tested | visited | online | hearsay
-- Valeur par défaut : tested (le plus courant pour les artisans/services)

SET @column_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'review_proposals'
      AND COLUMN_NAME = 'experience_type'
);

SET @sql := IF(
    @column_exists = 0,
    "ALTER TABLE review_proposals ADD COLUMN experience_type ENUM('tested','visited','online','hearsay') NOT NULL DEFAULT 'tested' AFTER images",
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
