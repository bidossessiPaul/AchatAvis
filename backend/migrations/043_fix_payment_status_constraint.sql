-- Migration 043: Fix payment status constraint to allow 'cancelled' and 'deactivated'
-- Note: MySQL 8.0+ supports check constraints. For older versions or stricter sync:

ALTER TABLE payments DROP CONSTRAINT IF EXISTS chk_payment_status;
ALTER TABLE payments ADD CONSTRAINT chk_payment_status 
CHECK (status IN ('pending', 'completed', 'failed', 'refunded', 'cancelled', 'deactivated', 'blocked', 'deleted'));

ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_status;
ALTER TABLE users ADD CONSTRAINT chk_status 
CHECK (status IN ('pending', 'active', 'suspended', 'rejected', 'deactivated'));
