-- Migration: Enhanced Anti-Detection System
-- Description: Creates tables for anti-detection rules, sector difficulty, Gmail accounts, and compliance scores.

-- 1. Table: anti_detection_rules
CREATE TABLE IF NOT EXISTS anti_detection_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    rule_key VARCHAR(50) UNIQUE NOT NULL,
    rule_name VARCHAR(100) NOT NULL,
    description_short VARCHAR(255),
    description_long TEXT,
    severity ENUM('low', 'medium', 'high', 'critical') DEFAULT 'medium',
    icon_emoji VARCHAR(10),
    order_index INT DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    impact_stats JSON,
    examples_do JSON,
    examples_dont JSON,
    tips JSON,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. Table: sector_difficulty
CREATE TABLE IF NOT EXISTS sector_difficulty (
    id INT AUTO_INCREMENT PRIMARY KEY,
    sector_name VARCHAR(100) NOT NULL,
    sector_slug VARCHAR(100) UNIQUE NOT NULL,
    difficulty ENUM('easy', 'medium', 'hard') DEFAULT 'easy',
    google_strictness_level INT DEFAULT 1,
    max_reviews_per_month_per_email INT NULL,
    min_days_between_reviews INT DEFAULT 3,
    warning_message TEXT,
    tips JSON,
    icon_emoji VARCHAR(10),
    validation_rate_avg DECIMAL(5,2) DEFAULT 0.00,
    required_gmail_level ENUM('nouveau', 'bronze', 'silver', 'gold') DEFAULT 'nouveau',
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Table: guide_gmail_accounts
CREATE TABLE IF NOT EXISTS guide_gmail_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    trust_score INT DEFAULT 0,
    account_level ENUM('nouveau', 'bronze', 'silver', 'gold') DEFAULT 'nouveau',
    account_age_days INT DEFAULT 0,
    has_profile_picture BOOLEAN DEFAULT FALSE,
    total_reviews_posted INT DEFAULT 0,
    successful_reviews INT DEFAULT 0,
    rejected_reviews INT DEFAULT 0,
    success_rate DECIMAL(5,2) DEFAULT 0.00,
    last_review_posted_at DATETIME,
    sector_activity_log JSON,
    allowed_sectors JSON,
    is_active BOOLEAN DEFAULT TRUE,
    is_banned BOOLEAN DEFAULT FALSE,
    ban_reason TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY (user_id, email),
    CONSTRAINT fk_gmail_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: guide_compliance_scores
CREATE TABLE IF NOT EXISTS guide_compliance_scores (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) UNIQUE NOT NULL,
    compliance_score INT DEFAULT 100,
    rules_followed_count INT DEFAULT 0,
    rules_violated_count INT DEFAULT 0,
    last_violation_date DATETIME,
    violations_log JSON,
    warnings_count INT DEFAULT 0,
    recommendations JSON,
    certification_passed BOOLEAN DEFAULT FALSE,
    certification_passed_at DATETIME,
    certification_score INT,
    last_calculated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_compliance_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Modifications to existing tables
-- Add sector_id to campaigns (reviews_orders)
ALTER TABLE reviews_orders ADD COLUMN sector_id INT NULL;
ALTER TABLE reviews_orders ADD COLUMN sector_difficulty ENUM('easy', 'medium', 'hard') NULL;

-- Add sector_id to artisans_profiles
ALTER TABLE artisans_profiles ADD COLUMN sector_id INT NULL;
ALTER TABLE artisans_profiles ADD COLUMN sector_difficulty ENUM('easy', 'medium', 'hard') NULL;

-- Add gmail_account_id to reviews_submissions
ALTER TABLE reviews_submissions ADD COLUMN gmail_account_id INT NULL;
ALTER TABLE reviews_submissions ADD COLUMN sector_difficulty ENUM('easy', 'medium', 'hard') NULL;
ALTER TABLE reviews_submissions ADD COLUMN submission_warnings JSON NULL;
ALTER TABLE reviews_submissions ADD COLUMN auto_validation_score INT NULL;

-- Seeds for Rules (Phase 6 will handle more data, but basic rules here)
INSERT INTO anti_detection_rules (rule_key, rule_name, description_short, description_long, severity, icon_emoji, order_index) VALUES
('natural_navigation', 'Navigation Naturelle', 'Naviguez 2-3 min sur la fiche', 'Avant de poster, naviguez 2-3 minutes sur la fiche Google (Photos, horaires, avis...).', 'critical', '🧭', 1),
('patience_post_visite', 'Patience Post-Visite', 'Attendez 1-3h après visite', 'Ne postez jamais immédiatement après avoir ouvert Maps. Attendez au moins 1h.', 'high', '⏰', 2),
('mobile_data_only', '4G/5G Obligatoire', 'Désactivez le WiFi', 'Utilisez toujours votre connexion mobile (4G/5G). Jamais de WiFi public ou VPN.', 'critical', '📱', 3);

-- Seeds for basic Sectors
INSERT INTO sector_difficulty (sector_name, sector_slug, difficulty, google_strictness_level, icon_emoji) VALUES
('Restaurant', 'restaurant', 'easy', 2, '🍽️'),
('Coiffure', 'coiffure', 'easy', 2, '💇'),
('Automobile', 'automobile', 'medium', 3, '🚗'),
('Plomberie', 'plomberie', 'hard', 5, '🔧');
