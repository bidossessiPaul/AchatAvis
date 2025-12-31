-- Migration: Add full_name to users table
ALTER TABLE users ADD COLUMN full_name VARCHAR(255) AFTER email;
