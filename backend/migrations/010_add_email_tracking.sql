-- Add google_email tracking to submissions to prevent multiple posts from same account on same business
ALTER TABLE reviews_submissions ADD COLUMN google_email VARCHAR(255) AFTER review_url;

-- Add a column to track when the order was actually made available to guides
-- (Optional but helpful for real relative time)
ALTER TABLE reviews_orders ADD COLUMN published_at DATETIME;
UPDATE reviews_orders SET published_at = created_at WHERE published_at IS NULL;
