-- Migration: 006_add_enrichment_fields.sql
ALTER TABLE reviews_orders
ADD COLUMN IF NOT EXISTS staff_names TEXT,
ADD COLUMN IF NOT EXISTS specific_instructions TEXT;
