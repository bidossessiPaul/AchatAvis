-- Migration 050: Create guide level verification system

CREATE TABLE IF NOT EXISTS guide_level_verifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    guide_id VARCHAR(36) NOT NULL,
    gmail_account_id INT NOT NULL,
    screenshot_url TEXT NOT NULL,
    profile_link VARCHAR(500) NOT NULL,
    claimed_level INT NOT NULL,
    current_level INT NOT NULL DEFAULT 1,
    status ENUM('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
    admin_notes TEXT NULL,
    reviewed_by VARCHAR(36) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    reviewed_at DATETIME NULL,

    INDEX idx_level_verif_guide (guide_id),
    INDEX idx_level_verif_gmail (gmail_account_id),
    INDEX idx_level_verif_status (status),
    INDEX idx_level_verif_created (created_at),

    CONSTRAINT fk_level_verif_guide FOREIGN KEY (guide_id)
        REFERENCES users(id) ON DELETE CASCADE,
    CONSTRAINT fk_level_verif_gmail FOREIGN KEY (gmail_account_id)
        REFERENCES guide_gmail_accounts(id) ON DELETE CASCADE,
    CONSTRAINT fk_level_verif_admin FOREIGN KEY (reviewed_by)
        REFERENCES users(id) ON DELETE SET NULL,
    CONSTRAINT chk_claimed_level CHECK (claimed_level BETWEEN 1 AND 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
