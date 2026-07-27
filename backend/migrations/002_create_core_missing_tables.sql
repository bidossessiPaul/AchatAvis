-- Migration 002 : tables manquantes du jeu de migrations
--
-- guide_gmail_accounts et suspension_config existent en production mais aucune
-- migration ne les crée : elles ont été ajoutées à la main. Résultat, une base
-- reconstruite de zéro échoue sur toutes les migrations qui les altèrent
-- (025, 026, 041, 046, 052, 066, 033...).
--
-- Le schéma ci-dessous ne reprend que les colonnes de base : celles que les
-- migrations suivantes ciblent avec AFTER, plus celles lues par le code. Les
-- colonnes ajoutées plus tard (maps_profile_url, local_guide_level,
-- monthly_*, deleted_at...) sont volontairement laissées à leurs migrations.
-- Numérotée 002 pour s'exécuter avant tous ces ALTER.

CREATE TABLE IF NOT EXISTS guide_gmail_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    account_level INT DEFAULT 1,
    trust_score_value INT DEFAULT 0,
    trust_level VARCHAR(20) DEFAULT 'BRONZE',
    total_reviews_posted INT DEFAULT 0,
    has_profile_picture BOOLEAN DEFAULT FALSE,
    phone_verified BOOLEAN DEFAULT FALSE,
    google_maps_profile_url VARCHAR(500) DEFAULT NULL,
    email_syntax_valid BOOLEAN DEFAULT NULL,
    email_mx_valid BOOLEAN DEFAULT NULL,
    email_is_disposable BOOLEAN DEFAULT NULL,
    manual_verification_status VARCHAR(20) DEFAULT NULL,
    sector_activity_log JSON DEFAULT NULL,
    last_review_posted_at DATETIME DEFAULT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uniq_gmail_email (email),
    KEY idx_gmail_user (user_id),
    CONSTRAINT fk_gmail_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table de configuration du système de suspension. Le système a été retiré du
-- code (scripts commentés), mais la migration 033 l'altère encore.
CREATE TABLE IF NOT EXISTS suspension_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT FALSE,
    auto_suspend_enabled BOOLEAN DEFAULT FALSE,
    manual_suspend_only BOOLEAN DEFAULT TRUE,
    max_warnings_before_suspend INT DEFAULT 3,
    exempted_countries JSON DEFAULT NULL,
    exempted_user_ids JSON DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Ligne de configuration unique attendue par le code (WHERE id = 1)
INSERT INTO suspension_config (id, is_enabled, auto_suspend_enabled, manual_suspend_only, max_warnings_before_suspend, exempted_countries, exempted_user_ids)
SELECT 1, FALSE, FALSE, TRUE, 3, '[]', '[]'
WHERE NOT EXISTS (SELECT 1 FROM suspension_config WHERE id = 1);
