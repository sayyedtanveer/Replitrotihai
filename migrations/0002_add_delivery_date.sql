-- Migration: 0002_add_delivery_date.sql
-- Purpose: Add optional delivery_date column to orders for scheduled deliveries
-- Up: add column for storing delivery dates in YYYY-MM-DD format
-- Down: drop the column (see bottom of file)

BEGIN;

-- Add nullable text column for delivery date (YYYY-MM-DD format)
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS delivery_date text;

COMMIT;

-- ROLLBACK (manual):
-- To remove the column, run:
-- ALTER TABLE orders DROP COLUMN IF EXISTS delivery_date;
