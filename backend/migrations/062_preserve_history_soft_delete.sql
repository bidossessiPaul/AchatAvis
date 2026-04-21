-- Préservation totale de l'historique : plus jamais de hard-delete sur les
-- tables critiques. Ajout d'un flag `deleted_at` + index pour filtrer.
--
-- Tables concernées :
--   users                   : suppression d'un compte (admin, artisan, guide)
--   reviews_orders          : suppression d'une fiche/commande
--   review_proposals        : suppression d'un contenu IA généré
--   identity_verifications  : suppression d'une vérification KYC
--
-- Toutes les queries SELECT de ces tables filtrent désormais
-- WHERE deleted_at IS NULL. Les queries JOIN sur ces tables conservent
-- l'historique visible (ex: un avis validé sur une fiche supprimée reste
-- visible dans le soldes/gains du guide).

-- users
SET @dbname = DATABASE();
SET @tbl = 'users';
SET @col = 'deleted_at';
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = @tbl AND COLUMN_NAME = @col) = 0,
    'ALTER TABLE users ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT "Soft delete: historique préservé"',
    'SELECT "users.deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'users' AND INDEX_NAME = 'idx_users_deleted_at') = 0,
    'CREATE INDEX idx_users_deleted_at ON users(deleted_at)',
    'SELECT "idx_users_deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- reviews_orders
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'reviews_orders' AND COLUMN_NAME = 'deleted_at') = 0,
    'ALTER TABLE reviews_orders ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT "Soft delete: historique préservé"',
    'SELECT "reviews_orders.deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'reviews_orders' AND INDEX_NAME = 'idx_reviews_orders_deleted_at') = 0,
    'CREATE INDEX idx_reviews_orders_deleted_at ON reviews_orders(deleted_at)',
    'SELECT "idx_reviews_orders_deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- review_proposals
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'review_proposals' AND COLUMN_NAME = 'deleted_at') = 0,
    'ALTER TABLE review_proposals ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT "Soft delete: historique préservé"',
    'SELECT "review_proposals.deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'review_proposals' AND INDEX_NAME = 'idx_review_proposals_deleted_at') = 0,
    'CREATE INDEX idx_review_proposals_deleted_at ON review_proposals(deleted_at)',
    'SELECT "idx_review_proposals_deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- identity_verifications
SET @sql = IF(
    (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = @dbname AND TABLE_NAME = 'identity_verifications' AND COLUMN_NAME = 'deleted_at') = 0,
    'ALTER TABLE identity_verifications ADD COLUMN deleted_at DATETIME DEFAULT NULL COMMENT "Soft delete: historique préservé"',
    'SELECT "identity_verifications.deleted_at déjà existant"'
);
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
