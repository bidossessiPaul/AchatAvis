-- 033_remove_trade_constraint.sql
-- Goal: Remove the limited check constraint on trades to allow dynamic sectors from sector_difficulty.

-- MariaDB uses DROP CONSTRAINT for check constraints
ALTER TABLE artisans_profiles DROP CONSTRAINT chk_trade;

-- Optional: Add an index on trade if it doesn't exist (it should already exist from 001_initial_schema.sql)
-- CREATE INDEX idx_artisans_trade ON artisans_profiles(trade);
