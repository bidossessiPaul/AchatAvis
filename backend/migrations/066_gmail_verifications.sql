-- Migration 066 : Table gmail_verifications
-- Permet aux guides de soumettre une capture d'écran + lien Maps pour chaque compte Gmail.
-- Un admin valide ou rejette. Si non validé avant le 1er mai 2026, le compte est auto-suspendu.

CREATE TABLE IF NOT EXISTS gmail_verifications (
  id VARCHAR(36) PRIMARY KEY,
  gmail_account_id INT NOT NULL,
  guide_id VARCHAR(36) NOT NULL,
  screenshot_url TEXT NOT NULL,
  screenshot_public_id VARCHAR(255),
  maps_profile_url TEXT NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  rejection_reason TEXT,
  submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  reviewed_at DATETIME,
  reviewed_by VARCHAR(36),
  deleted_at DATETIME DEFAULT NULL,
  INDEX idx_gv_gmail (gmail_account_id, status),
  INDEX idx_gv_guide (guide_id),
  INDEX idx_gv_status (status, deleted_at),
  CONSTRAINT fk_gv_gmail FOREIGN KEY (gmail_account_id) REFERENCES guide_gmail_accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_gv_guide FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_gv_admin FOREIGN KEY (reviewed_by) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT chk_gv_status CHECK (status IN ('pending', 'approved', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
