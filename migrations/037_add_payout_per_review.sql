-- Add payout_per_review to reviews_orders
ALTER TABLE reviews_orders ADD COLUMN payout_per_review DECIMAL(10, 2) DEFAULT 1.50;
