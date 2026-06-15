-- Validation de la formation PAR VIDEO :
-- chaque question du QCM est liee a une video (elle s'affiche a droite de la video
-- pendant le visionnage). Le guide doit obtenir >= 80% sur les questions de la video
-- pour passer a la suivante. Derniere video validee = formation terminee.
-- video_id NULL sur une question = question generale (fallback quand aucune video).

SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'training_questions'
      AND COLUMN_NAME = 'video_id'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE training_questions ADD COLUMN video_id INT NULL AFTER id, ADD CONSTRAINT fk_training_questions_video FOREIGN KEY (video_id) REFERENCES training_videos(id) ON DELETE SET NULL',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt

;

-- Tentatives par video : video_id NULL = tentative sur le QCM global (fallback)
SET @col_exists := (
    SELECT COUNT(*) FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'training_attempts'
      AND COLUMN_NAME = 'video_id'
);

SET @sql := IF(
    @col_exists = 0,
    'ALTER TABLE training_attempts ADD COLUMN video_id INT NULL AFTER user_id, ADD INDEX idx_training_attempts_video (user_id, video_id, passed)',
    'SELECT 1'
);

PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt
