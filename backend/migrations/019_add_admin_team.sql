-- Add permissions column to users table
ALTER TABLE users ADD COLUMN permissions JSON DEFAULT NULL;

-- Create admin_invitations table
CREATE TABLE IF NOT EXISTS admin_invitations (
    id VARCHAR(36) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE, 
    token VARCHAR(255) NOT NULL UNIQUE,
    permissions JSON NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NOT NULL
);
