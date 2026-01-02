-- Add reset password columns to users table
ALTER TABLE users ADD COLUMN reset_password_token VARCHAR(255) NULL AFTER two_factor_secret;
ALTER TABLE users ADD COLUMN reset_password_expires DATETIME NULL AFTER reset_password_token;
CREATE INDEX idx_reset_token ON users(reset_password_token);
