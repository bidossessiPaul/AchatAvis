-- Migration 014: Add Payout System
CREATE TABLE IF NOT EXISTS payout_requests (
    id VARCHAR(36) PRIMARY KEY,
    guide_id VARCHAR(36) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'paid', 'refused', 'in_revision') DEFAULT 'pending',
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    admin_note TEXT,
    FOREIGN KEY (guide_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for performance
CREATE INDEX idx_payout_guide ON payout_requests(guide_id);
CREATE INDEX idx_payout_status ON payout_requests(status);
