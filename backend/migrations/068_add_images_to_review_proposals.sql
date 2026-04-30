-- Ajout d'une colonne `images` (JSON) sur review_proposals.
-- Stocke un tableau d'objets { url, publicId } correspondant aux images
-- attachées par l'artisan à un avis lors de la rédaction (Step3AIGeneration).
-- Le quota total d'images par fiche dépend de la taille du pack :
--   pack 30 avis → 5 images max sur l'ensemble de la fiche
--   pack 60 avis → 10 images max
--   pack 90 avis → 25 images max

SET @column_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'review_proposals'
      AND COLUMN_NAME = 'images'
);

SET @sql := IF(
    @column_exists = 0,
    'ALTER TABLE review_proposals ADD COLUMN images JSON NULL AFTER author_name',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;
