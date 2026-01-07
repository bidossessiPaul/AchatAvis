-- Migration: Add mission locking columns to reviews_orders
-- To prevent multiple guides from working on the same mission simultaneously

ALTER TABLE reviews_orders 
ADD COLUMN IF NOT EXISTS locked_by VARCHAR(36) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS locked_until DATETIME DEFAULT NULL;

-- Add index for performance on locking queries
CREATE INDEX idx_orders_locking ON reviews_orders(locked_by, locked_until);
