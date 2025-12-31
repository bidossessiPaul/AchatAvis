-- Refine reviews_orders table to support detailed submission flow
ALTER TABLE reviews_orders 
ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS company_context TEXT,
ADD COLUMN IF NOT EXISTS sector VARCHAR(100),
ADD COLUMN IF NOT EXISTS zones TEXT,
ADD COLUMN IF NOT EXISTS positioning TEXT,
ADD COLUMN IF NOT EXISTS client_types TEXT,
ADD COLUMN IF NOT EXISTS desired_tone VARCHAR(50),
ADD COLUMN IF NOT EXISTS metadata JSON;

-- Update status check constraint to include 'draft' and 'submitted'
-- In MySQL 8.0.16+, we can drop and add properly.
ALTER TABLE reviews_orders DROP CONSTRAINT IF EXISTS chk_order_status;
ALTER TABLE reviews_orders ADD CONSTRAINT chk_order_status CHECK (status IN ('draft', 'submitted', 'pending', 'in_progress', 'completed', 'cancelled'));

-- Note: Modifying CHECK constraints in MySQL can be version dependent.
-- We will add a new constraint if possible or handle it in application logic.
-- For compatibility, we ensure the status list includes 'draft' and 'submitted'.
-- Since MySQL < 8.0.16 ignores CHECK constraints, we rely on application-level validation mostly.

-- If using MariaDB or MySQL 8.0.16+, we might need to drop and re-add.
-- But the standard 'ADD COLUMN' is safe.
