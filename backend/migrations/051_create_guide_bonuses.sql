-- Migration 051: Create guide bonuses table for level verification rewards

CREATE TABLE IF NOT EXISTS guide_bonuses (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guide_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    reason VARCHAR(255) NOT NULL,
    reference_id INT NULL COMMENT 'ID of the related record (e.g. level_verification id)',
    reference_type VARCHAR(50) NULL COMMENT 'Type of reference (e.g. level_verification)',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    INDEX idx_bonus_guide (guide_id),
    INDEX idx_bonus_created (created_at),

    CONSTRAINT fk_bonus_guide FOREIGN KEY (guide_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
