-- Migration: 007_add_order_google_url.sql
ALTER TABLE reviews_orders
ADD COLUMN IF NOT EXISTS google_business_url VARCHAR(500);
