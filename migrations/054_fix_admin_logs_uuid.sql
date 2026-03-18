-- Fix admin_logs table to support UUID instead of INT
-- This corrects the incompatibility between users.id (VARCHAR(36)) and admin_logs.admin_id (INT)

-- Drop the foreign key constraint first
ALTER TABLE admin_logs DROP FOREIGN KEY admin_logs_ibfk_1;

-- Modify admin_id from INT to VARCHAR(36) to match users.id
ALTER TABLE admin_logs MODIFY COLUMN admin_id VARCHAR(36) NOT NULL;

-- Modify target_id from INT to VARCHAR(36) to support UUID targets
ALTER TABLE admin_logs MODIFY COLUMN target_id VARCHAR(36);

-- Recreate the foreign key constraint with the correct type
ALTER TABLE admin_logs
ADD CONSTRAINT admin_logs_ibfk_1
FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE;
