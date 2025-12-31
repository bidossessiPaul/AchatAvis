-- Add review_proposals table for AI generated content
CREATE TABLE IF NOT EXISTS review_proposals (
    id VARCHAR(36) PRIMARY KEY,
    order_id VARCHAR(36) NOT NULL,
    content TEXT NOT NULL,
    rating INT DEFAULT 5,
    author_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'draft',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_proposal_order FOREIGN KEY (order_id) REFERENCES reviews_orders(id) ON DELETE CASCADE,
    CONSTRAINT chk_proposal_status CHECK (status IN ('draft', 'approved', 'rejected'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Check if subscription_status exists in artisans_profiles before adding
-- Since IF NOT EXISTS COLUMN is not standard in all MySQL versions, we use a stored procedure approach 
-- or simply rely on the app logic to use subscription_tier IS NOT NULL as active.
-- For now, let's assume 'subscription_tier' presence means active, or we can add a specific status column.

ALTER TABLE artisans_profiles ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(20) DEFAULT 'inactive';
ALTER TABLE artisans_profiles ADD COLUMN IF NOT EXISTS subscription_end_date DATETIME;
