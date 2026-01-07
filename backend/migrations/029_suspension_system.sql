-- Migration: Multi-level Suspension System
-- Description: Creates tables for configuration, levels, active suspensions, warnings, and history.

-- 1. Table: suspension_config
CREATE TABLE IF NOT EXISTS suspension_config (
    id INT AUTO_INCREMENT PRIMARY KEY,
    is_enabled BOOLEAN DEFAULT TRUE,
    auto_suspend_enabled BOOLEAN DEFAULT TRUE,
    manual_suspend_only BOOLEAN DEFAULT FALSE,
    max_warnings_before_suspend INT DEFAULT 3,
    send_email_notifications BOOLEAN DEFAULT TRUE,
    send_inapp_notifications BOOLEAN DEFAULT TRUE,
    exempted_countries JSON, -- e.g., ["CI", "BJ"]
    exempted_user_ids JSON, -- e.g., ["uuid1", "uuid2"]
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default config
INSERT INTO suspension_config (is_enabled, exempted_countries) VALUES (TRUE, '["CI", "BJ"]');

-- 2. Table: suspension_levels
CREATE TABLE IF NOT EXISTS suspension_levels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    level_number INT UNIQUE NOT NULL,
    level_name VARCHAR(100) NOT NULL,
    level_code VARCHAR(50) UNIQUE NOT NULL,
    duration_days INT NOT NULL,
    badge_color VARCHAR(20),
    icon_emoji VARCHAR(10),
    severity ENUM('info', 'warning', 'danger', 'critical'),
    reason_template TEXT,
    consequences JSON,
    requirements_to_lift JSON,
    auto_lift_after_duration BOOLEAN DEFAULT TRUE,
    next_level_id INT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Seed Levels
INSERT INTO suspension_levels (level_number, level_name, level_code, duration_days, badge_color, icon_emoji, severity, consequences, requirements_to_lift, auto_lift_after_duration) VALUES
(1, 'Avertissement Sérieux', 'WARNING_1', 1, 'yellow', '🟡', 'warning', '{"can_take_missions": false, "earnings_frozen": false, "withdrawals_blocked": false, "requires_quiz": false, "requires_admin_validation": false}', '{"wait_duration": true}', TRUE),
(2, 'Suspension Modérée', 'SUSPEND_2', 3, 'orange', '🟠', 'danger', '{"can_take_missions": false, "earnings_frozen": true, "withdrawals_blocked": true, "requires_quiz": false, "requires_admin_validation": false}', '{"wait_duration": true}', TRUE),
(3, 'Suspension Sévère', 'SUSPEND_3', 7, 'red', '🔴', 'critical', '{"can_take_missions": false, "earnings_frozen": true, "withdrawals_blocked": true, "requires_quiz": true, "requires_admin_validation": true}', '{"wait_duration": true, "pass_quiz": true, "contact_support": true, "admin_approval": true}', FALSE),
(4, 'Dernière Chance', 'LAST_CHANCE_4', 14, 'red', '🔴', 'critical', '{"can_take_missions": false, "earnings_frozen": true, "withdrawals_blocked": true, "requires_quiz": true, "requires_admin_validation": true}', '{"wait_duration": true, "pass_quiz": true, "contact_support": true, "admin_approval": true}', FALSE),
(5, 'Bannissement Définitif', 'BAN_PERMANENT', 99999, 'black', '⛔', 'critical', '{"can_take_missions": false, "earnings_frozen": true, "withdrawals_blocked": true}', '{"wait_duration": false}', FALSE);

-- 3. Table: user_suspensions
CREATE TABLE IF NOT EXISTS user_suspensions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    suspension_level_id INT NOT NULL,
    reason_category ENUM('spam_submissions', 'sector_cooldown_violation', 'invalid_proofs_repeated', 'identical_reviews', 'vpn_proxy_detected', 'multi_accounting', 'manual_admin', 'other'),
    reason_details TEXT,
    trigger_proof_id CHAR(36) NULL,
    started_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    ends_at DATETIME NOT NULL,
    days_total INT,
    is_active BOOLEAN DEFAULT TRUE,
    auto_lifted BOOLEAN DEFAULT FALSE,
    lifted_at DATETIME NULL,
    lifted_by_admin_id VARCHAR(36) NULL,
    lift_reason TEXT NULL,
    admin_notes TEXT NULL,
    user_acknowledged BOOLEAN DEFAULT FALSE,
    user_acknowledged_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX (user_id, is_active),
    INDEX (ends_at),
    CONSTRAINT fk_suspension_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_suspension_level FOREIGN KEY (suspension_level_id) REFERENCES suspension_levels(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. Table: suspension_warnings
CREATE TABLE IF NOT EXISTS suspension_warnings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    warning_type VARCHAR(100),
    warning_message TEXT,
    severity ENUM('low', 'medium', 'high'),
    trigger_proof_id CHAR(36) NULL,
    trigger_campaign_id CHAR(36) NULL,
    violation_details JSON,
    is_resolved BOOLEAN DEFAULT FALSE,
    resolved_at DATETIME NULL,
    resolved_by_admin_id VARCHAR(36) NULL,
    escalated_to_suspension_id INT NULL,
    user_viewed BOOLEAN DEFAULT FALSE,
    user_viewed_at DATETIME NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id, is_resolved),
    CONSTRAINT fk_warning_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Table: suspension_history
CREATE TABLE IF NOT EXISTS suspension_history (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id VARCHAR(36) NOT NULL,
    suspension_level INT,
    level_name VARCHAR(100),
    reason_category VARCHAR(100),
    reason_details TEXT,
    started_at DATETIME,
    ended_at DATETIME,
    duration_days INT,
    was_lifted_early BOOLEAN,
    lifted_by_admin_id VARCHAR(36) NULL,
    outcome ENUM('completed', 'lifted_early', 'escalated', 'converted_to_ban'),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    INDEX (user_id),
    CONSTRAINT fk_history_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Update users table with new fields
ALTER TABLE users ADD COLUMN suspension_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN warning_count INT DEFAULT 0;
ALTER TABLE users ADD COLUMN last_suspended_at DATETIME NULL;
ALTER TABLE users ADD COLUMN is_banned BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN banned_at DATETIME NULL;
ALTER TABLE users ADD COLUMN ban_reason TEXT NULL;

-- Create index for performance
CREATE INDEX idx_users_banned ON users(is_banned);
