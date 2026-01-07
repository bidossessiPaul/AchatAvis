-- Migration to add last_user_agent to users table
ALTER TABLE users ADD COLUMN last_user_agent VARCHAR(512) NULL;
