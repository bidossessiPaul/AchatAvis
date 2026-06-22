-- Migration 081: Suivi des bonus mensuels (25 avis validés = 5€ réclamables)

CREATE TABLE IF NOT EXISTS monthly_bonus_claims (
    id VARCHAR(36) NOT NULL,
    guide_id VARCHAR(36) NOT NULL,
    month TINYINT NOT NULL COMMENT 'Mois (1-12)',
    year SMALLINT NOT NULL COMMENT 'Année (ex: 2026)',
    validated_count INT NOT NULL DEFAULT 0 COMMENT 'Nb avis validés au moment de la réclamation',
    notified_at DATETIME DEFAULT NULL COMMENT 'Date d\'envoi du mail de notification',
    claimed_at DATETIME DEFAULT NULL COMMENT 'Date de réclamation du bonus',
    amount DECIMAL(8,2) NOT NULL DEFAULT 5.00,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_guide_month_year (guide_id, month, year),
    INDEX idx_mbc_guide (guide_id),
    CONSTRAINT fk_mbc_guide FOREIGN KEY (guide_id)
        REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
